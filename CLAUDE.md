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
- EF migrations (run from the solution dir; `dotnet-ef` is pinned in `.config/dotnet-tools.json`, so `dotnet tool restore` once first):
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
- **HealthArchive.Application** — DTOs, repository interfaces (`I*Repository`), and AutoMapper profiles (`*Mapper`). Defines the contracts; no EF here.
- **HealthArchive.Infrastructure** — `DBContextHealth` (EF Core, owned-type config in `OnModelCreating`), repository implementations, and Migrations.
- **HealthArchiveAPI** — Controllers + `Program.cs` (composition root: DI registration, CORS, Swagger).

Conventions:
- **Repository pattern.** Controllers depend only on `I*Repository` + `IMapper`, never on `DBContextHealth`. Register new repos as scoped in `Program.cs`. Repos expose a `bool Save()` wrapping `SaveChanges()`, and mutation methods return `bool`.
- Controllers use attribute routing with explicit `[Route("Verb")]` action names (e.g. `api/Patient/GetPatients`), not REST resource conventions.
- Owned types (`OwnsOne`) map value objects into the parent table — see `DBContextHealth.OnModelCreating`.
- AutoMapper is wired via a single assembly scan: `AddAutoMapper(typeof(DoctorMapper).Assembly)`.

Gotchas:
- **Connection string is intentionally empty** in `appsettings.json` — set `ConnectionStrings:DbContext` via user-secrets (`UserSecretsId` is in the csproj) or environment. Postgres, not SQL Server.
- `Program.cs` sets `Npgsql.EnableLegacyTimestampBehavior = true` so `DateTime`s map to `timestamp without time zone`. A comment marks this for removal once repos go async + UTC.
- **Do not bump AutoMapper to v15+** — it became commercially licensed. Stay on 13/14 or map by hand. (See project memory `modernization-plan`.)
- `seed_testdata.sql` / `seed_test_data.sql` exist for local data.

### Authentication & authorization

JWT-based auth is wired (real). The access + refresh tokens travel in **httpOnly cookies**, not the `Authorization` header — this keeps the Vercel↔Railway cross-domain deploy config-only.

- **Password hashing:** `PasswordHasherService` (`IPasswordHasher`) wraps ASP.NET Identity's `PasswordHasher<Doctor>` (reuses the already-referenced `Identity.EntityFrameworkCore`; no BCrypt). Registration hashes; `AuthServiceRepository.Authenticate` verifies. **Pre-existing plaintext-password doctors can no longer log in** — re-register or reseed with hashes.
- **Tokens:** `TokenService` (`ITokenService`) signs the access JWT (claims `sub`/`email`/`role`) from `Jwt:*` config and mints random refresh tokens. Refresh tokens are persisted/rotated via `RefreshToken` entity + `RefreshTokenRepository`.
- **Program.cs:** `AddAuthentication`/`AddJwtBearer` reads the access token from the `access_token` cookie via `JwtBearerEvents.OnMessageReceived`. CORS uses explicit origins from `Cors:AllowedOrigins` + `AllowCredentials()` (cookies forbid `AllowAnyOrigin`). Pipeline order: `UseCors` → `UseAuthentication` → `UseAuthorization`.
- **Endpoints (`AuthServiceController`):** `Login` / `Refresh` (rotates) / `Logout` (revokes) / `Me` (rehydrate). Cookies are `HttpOnly` `Secure` `SameSite=None`. `[Authorize]` guards Doctor/Patient/Hce/Evolution controllers; registration/login/refresh are `[AllowAnonymous]`.
- **Roles:** `Doctor.Role` (default `"Doctor"`). Use `[Authorize(Roles="Admin")]` for admin-only endpoints — the role claim is already emitted.
- **Config (env-var driven for deploy):** `Jwt:Key` (set via user-secrets locally; **≥32 bytes** or HMAC signing throws), `Jwt:Issuer`/`Audience`/`AccessTokenMinutes`/`RefreshTokenDays`, `Cors:AllowedOrigins`, `Cookies:Secure`/`SameSite`. On Railway set `Jwt__Key`, `Cors__AllowedOrigins=<vercel-url>`, etc.

## Frontend architecture

- **Entry/routing:** `pages/App/App.tsx` wires `react-router` v6. Public routes (`/`, `/Login`, `/Register`) are open; everything under the `<AuthGuard>` layout route (Pacientes, Profesionales, HistoriaClinica) is protected.
- **Auth state:** `Guards/AuthGuard.tsx` gates routes on `store.Professional.name` from Redux — if empty, it redirects to Login. This is only the client-side gate; the real token lives in an **httpOnly cookie the JS never reads**, and every API call is validated server-side. On startup `pages/App/AuthBootstrap.tsx` calls `/api/AuthService/Me` to validate the cookie and rehydrate (or clear) Redux. Logout is the `logout` thunk in `Redux/States/professional.ts` (calls `/Logout`, then resets).
- **State:** Redux Toolkit, single store in `Redux/Store.ts` with one `Professional` slice (`Redux/States/professional.ts`); the slice mirrors the backend `AuthUserDto` (`name`, `lastName`, `email`, `tuition`, `role`) and persists to localStorage.
- **API access:** All HTTP goes through `src/api/client.ts` — thin typed wrappers (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiPostFile`) over `fetch`. Every call sends `credentials: 'include'` (cookies); on a 401 the client attempts a single `/Refresh` then retries, and on failure clears the session and redirects to Login. Base URL comes from `import.meta.env.VITE_API_URL`. Add new calls here rather than calling `fetch` directly.
- **Env:** copy `.env.example` to `.env.local` and set `VITE_API_URL` (points at the running API). Vite env vars must be prefixed `VITE_`.
- **Pages** live in `src/pages/<Feature>/`, each co-located with its `.scss` (Sass) and an `index.ts` barrel. Bootstrap 5 is the CSS base.
- Rich text uses `draft-js`; PDF export uses `jspdf` + `html2canvas`.

Gotchas:
- `vite.config.ts` injects `define: { global: 'globalThis' }` because `draft-js` references the webpack-era `global`. Removing it crashes the app.
- CRA has been replaced by Vite; use `import.meta.env`, not `process.env`. Do not propose migrating to Next.js — that was evaluated and rejected (see project memory `frontend-react-vite-decision`).
