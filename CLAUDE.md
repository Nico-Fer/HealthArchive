# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

HealthArchive is an electronic health-record (HCE) management app for doctors. Two independent apps in one repo:

- `api/HealthArchiveAPI/` — ASP.NET Core Web API (.NET 10) using Clean Architecture, EF Core + PostgreSQL (Npgsql).
- `web-app/` — React 18 SPA (TypeScript) built with Vite, Redux Toolkit, react-router v6.

The frontend talks to the API purely over HTTP; there is no shared code. Naming mixes Spanish and English throughout (routes, components, folders) — follow whatever the surrounding file uses.

## Commands

### Backend (`api/HealthArchiveAPI/`)
- Build: `dotnet build HealthArchiveAPI.sln`
- Run API (Swagger at `/swagger`): `dotnet run --project HealthArchiveAPI` serves on `https://localhost:7217`. Running via IIS Express (Visual Studio) instead serves on `https://localhost:44393` (the `sslPort` in `launchSettings.json`). The frontend `web-app/.env.local` `VITE_API_URL` must point at whichever you use.
- EF migrations — **CLI only**, run from the solution dir. The design-time pieces live in `HealthArchiveAPI` (`Microsoft.EntityFrameworkCore.Design`); `Microsoft.EntityFrameworkCore.Tools` was removed from `HealthArchive.Infrastructure` on purpose (it only added Visual Studio's Package Manager Console cmdlets and dragged in a vulnerable transitive dependency), so **`Add-Migration`/`Update-Database` in the PMC no longer work** — use `dotnet ef`. The manifest pinning `dotnet-ef` is at `HealthArchiveAPI/.config/dotnet-tools.json` (`dotnet tool restore` once first, or use a global install).
  - Add: `dotnet ef migrations add <Name> --project HealthArchive.Infrastructure --startup-project HealthArchiveAPI`
  - Apply: `dotnet ef database update --project HealthArchive.Infrastructure --startup-project HealthArchiveAPI`
- SDK is pinned to 10.0.301 via `global.json`. There is no test project.

### Frontend (`web-app/`)
- Install: `npm install`
- Dev server (port 3000): `npm run dev`
- Production build: `npm run build`
- Preview build: `npm run preview`
- No test runner is wired up despite `@testing-library/*` being present in devDependencies; `npm test` does not exist.

## Backend architecture

Clean Architecture, four projects with strict inward dependencies (API → Infrastructure → Application → Domain):

- **HealthArchive.Domain** — POCO entities only (`Patient`, `Doctor`, `HCE`, `Evolution`, `HCEFile`, and owned value objects `Phone`, `MedicalCoverage`, `EvolutionInfo`). No dependencies.
- **HealthArchive.Application** — DTOs, repository interfaces (`I*Repository`), and the hand-written mappers (`Mapping/*Mapper.cs`). Defines the contracts; no EF here.
- **HealthArchive.Infrastructure** — `DBContextHealth` (EF Core, owned-type config in `OnModelCreating`), repository implementations, and Migrations.
- **HealthArchiveAPI** — Controllers + `Program.cs` (composition root: DI registration, CORS, Swagger).

Conventions:
- **Repository pattern.** Controllers depend only on `I*Repository`, never on `DBContextHealth`. Register new repos as scoped in `Program.cs`. Repos expose a `bool Save()` wrapping `SaveChanges()`, and mutation methods return `bool`.
- Controllers use attribute routing with explicit `[Route("Verb")]` action names (e.g. `api/Patient/GetPatients`), not REST resource conventions.
- Owned types (`OwnsOne`) map value objects into the parent table — see `DBContextHealth.OnModelCreating`.
- **Mapping is hand-written, no AutoMapper.** `HealthArchive.Application/Mapping/*Mapper.cs` are static classes of extension methods, so there is nothing to register in DI and the compiler checks every assignment. Conventions: `dto.ToEntity()` builds a new entity, `dto.ApplyTo(entity)` overwrites an entity already tracked by EF (partial update), `entity.To*Dto()` goes the other way. When a DTO or entity gains a property, update the mapper — nothing does it by reflection anymore.

Gotchas:
- **Connection string is intentionally empty** in `appsettings.json` — set `ConnectionStrings:DbContext` via user-secrets (`UserSecretsId` is in the csproj) or environment. Postgres, not SQL Server.
- `Program.cs` sets `Npgsql.EnableLegacyTimestampBehavior = true` so `DateTime`s map to `timestamp without time zone`. A comment marks this for removal once repos go async + UTC.
- **Never reintroduce AutoMapper.** v15+ is commercially licensed and the last free versions (13/14) carry a High-severity advisory. It was removed on purpose.
- `seed_testdata.sql` / `seed_test_data.sql` exist for local data.

### Configuración por ambiente (backend)

`appsettings.json` es la base común y **no lleva secretos ni URLs**; encima se aplica `appsettings.{Environment}.json`:

- `appsettings.Development.json` — CORS a `localhost:3000`/`4173`, logging del SQL de EF. `ConnectionStrings:DbContext` y `Jwt:Key` van en **user-secrets**.
- `appsettings.Production.json` — logging en `Warning`. Todo lo del deploy llega por **env vars** (`DATABASE_URL`, `Jwt__Key`, `Cors__AllowedOrigins`, `RunMigrationsOnStartup`), nunca versionado.

En Production, `Program.cs` valida al arrancar que `Jwt:Key` tenga ≥32 bytes y que `Cors:AllowedOrigins` no esté vacío, y tira excepción si no — es preferible que no arranque a que falle request por request.

### Authentication & authorization

JWT-based auth is wired (real). The access + refresh tokens travel in **httpOnly cookies**, not the `Authorization` header — this keeps the Vercel↔Railway cross-domain deploy config-only.

- **Password hashing:** `PasswordHasherService` (`IPasswordHasher`) wraps ASP.NET Identity's `PasswordHasher<Doctor>` (reuses the already-referenced `Identity.EntityFrameworkCore`; no BCrypt). Registration hashes; `AuthServiceRepository.Authenticate` verifies. **Pre-existing plaintext-password doctors can no longer log in** — re-register or reseed with hashes.
- **Tokens:** `TokenService` (`ITokenService`) signs the access JWT (claims `sub`/`email`/`role`) from `Jwt:*` config and mints random refresh tokens. Refresh tokens are persisted/rotated via `RefreshToken` entity + `RefreshTokenRepository`.
- **Program.cs:** `AddAuthentication`/`AddJwtBearer` reads the access token from the `access_token` cookie via `JwtBearerEvents.OnMessageReceived`. CORS uses explicit origins from `Cors:AllowedOrigins` + `AllowCredentials()` (cookies forbid `AllowAnyOrigin`). Pipeline order: `UseCors` → `UseAuthentication` → `UseAuthorization`.
- **Endpoints (`AuthServiceController`):** `Login` / `Refresh` (rotates) / `Logout` (revokes) / `Me` (rehydrate). Cookies are `HttpOnly` `Secure` `SameSite=None`. `[Authorize]` guards Doctor/Patient/Hce/Evolution controllers; registration/login/refresh are `[AllowAnonymous]`.
- **Roles:** `Doctor.Role` (default `"Doctor"`), emitido como claim por `TokenService`. Designar un admin es `UPDATE "Doctors" SET "Role"='Admin' WHERE "Email"='...'` — no hay migración ni UI para esto, y **el doctor tiene que volver a loguearse** porque el rol viaja dentro del JWT.
- **Config (env-var driven for deploy):** `Jwt:Key` (set via user-secrets locally; **≥32 bytes** or HMAC signing throws), `Jwt:Issuer`/`Audience`/`AccessTokenMinutes`/`RefreshTokenDays`, `Cors:AllowedOrigins`, `Cookies:Secure`/`SameSite`, `Registration:ConsultoryCode`. On Railway set `Jwt__Key`, `Cors__AllowedOrigins=<vercel-url>`, `Registration__ConsultoryCode`, etc.

### Modelo de seguridad

Decisión explícita: **el acceso a pacientes es compartido**. Cualquier doctor autenticado ve todas las historias clínicas — el modelo es un consultorio donde los profesionales se cubren entre sí, y la trazabilidad se resuelve con `Evolution.EvolutionInfo` (`ModifiedBy`/`Tuition`), no restringiendo lectura. No hay FK de `Patient` a `Doctor` y no debe agregarse una sin revisar esta decisión.

Consecuencia directa: **el registro es el único perímetro del sistema**. De ahí los controles que existen:

- `Registration:ConsultoryCode` — el código de alta **nunca va en el código fuente** (el repo es público). Vacío en `appsettings.json`, `"1234"` solo en Development, y en Production `Program.cs` no arranca si falta. `DoctorController` además devuelve 503 si está sin configurar, para que un código vacío más un `consultoryCode` nulo en el body no comparen iguales.
- `Doctor.Password` lleva `[JsonIgnore]`. Varios endpoints devuelven la entidad `Doctor` completa; el atributo protege a todos de una sola vez, presente y futuro. **No quitarlo.**
- `DoctorController.CanActOn()` — un doctor solo se edita/borra a sí mismo; para tocar a otro hace falta `Admin`. Los pacientes, en cambio, no llevan chequeo de pertenencia a propósito (ver decisión de arriba).
- Rate limiting global (100/min por IP) y política `"auth"` (10/min) sobre `Login`, `Refresh` y `CreateDoctor`, que son los tres anónimos. Particiona por IP, lo que **depende de `UseForwardedHeaders`**; y `UseRateLimiter()` va después de `UseCors` para que los 429 lleguen al browser como 429 y no como error de CORS.

RLS de Postgres está desactivado y no aplica acá: la app se conecta con un único rol dueño de las tablas (que bypasea RLS), la conexión no lleva identidad de usuario, y no hay columna de pertenencia sobre la cual filtrar.

### Deploy

API en **Railway** (container Docker, `api/HealthArchiveAPI/Dockerfile`, Root Directory = `api/HealthArchiveAPI`) + Postgres de Railway; front en **Vercel** (Root Directory = `web-app`, config en `web-app/vercel.json`). Procedimiento completo y troubleshooting en `docs/deploy.md`.

Lo que `Program.cs` hace específicamente para ese entorno: bindea Kestrel a `$PORT` si existe; traduce `DATABASE_URL` (URI de Railway) al formato key=value de Npgsql cuando no hay `ConnectionStrings:DbContext`; `UseForwardedHeaders` con `KnownProxies`/`KnownNetworks` limpios (el proxy no tiene IP fija); `UseHttpsRedirection` y Swagger quedan **solo en Development** (en prod el TLS lo termina el proxy); expone `/health` sin auth para el healthcheck; y aplica migraciones al arrancar si `RunMigrationsOnStartup=true` (default `false`).

## Frontend architecture

- **Entry/routing:** `pages/App/App.tsx` wires `react-router` v6. Public routes (`/`, `/Login`, `/Register`) are open; everything under the `<AuthGuard>` layout route (Pacientes, Profesionales, HistoriaClinica) is protected.
- **Auth state:** `Guards/AuthGuard.tsx` gates routes on `store.Professional.name` from Redux — if empty, it redirects to Login. This is only the client-side gate; the real token lives in an **httpOnly cookie the JS never reads**, and every API call is validated server-side. On startup `pages/App/AuthBootstrap.tsx` calls `/api/AuthService/Me` to validate the cookie and rehydrate (or clear) Redux. Logout is the `logout` thunk in `Redux/States/professional.ts` (calls `/Logout`, then resets).
- **State:** Redux Toolkit, single store in `Redux/Store.ts` with one `Professional` slice (`Redux/States/professional.ts`); the slice mirrors the backend `AuthUserDto` (`name`, `lastName`, `email`, `tuition`, `role`) and persists to localStorage.
- **API access:** All HTTP goes through `src/api/client.ts` — thin typed wrappers (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiPostFile`) over `fetch`. Every call sends `credentials: 'include'` (cookies); on a 401 the client attempts a single `/Refresh` then retries, and on failure clears the session and redirects to Login. Base URL comes from `import.meta.env.VITE_API_URL`. Add new calls here rather than calling `fetch` directly.
- **Env:** vars must be prefixed `VITE_`. `.env.development` is committed and holds the local default (`VITE_API_URL=https://localhost:7217`, the `dotnet run` https profile); override it in `.env.local` (gitignored) if your API listens elsewhere — e.g. `https://localhost:44393` for IIS Express. There is **no committed `.env.production`**: on Vercel the value is a project Environment Variable, and `vite.config.ts` throws if it's missing from a production build. See `.env.example`.
- **Pages** live in `src/pages/<Feature>/`, each co-located with its `.scss` (Sass) and an `index.ts` barrel. Bootstrap 5 is the CSS base.
- Rich text uses `draft-js`; PDF export uses `jspdf` + `html2canvas`.

Gotchas:
- `vite.config.ts` injects `define: { global: 'globalThis' }` because `draft-js` references the webpack-era `global`. Removing it crashes the app.
- CRA has been replaced by Vite; use `import.meta.env`, not `process.env`. Do not propose migrating to Next.js — that was evaluated and rejected (see project memory `frontend-react-vite-decision`).
