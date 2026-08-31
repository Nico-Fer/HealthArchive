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

**El `Consultorio` es la unidad de aislamiento.** `Doctor` y `Patient` llevan `ConsultorioId` (FK requerida) y un doctor solo ve los datos de su consultorio. Dentro del consultorio el acceso es **compartido**: cualquier doctor ve todas las historias clínicas de ese consultorio, porque el modelo es un equipo que se cubre entre sí; la **lectura** es compartida y la trazabilidad se resuelve con `Evolution.EvolutionInfo` (`ModifiedBy`/`Tuition`). La **escritura de una evolución, en cambio, es del autor**: ver *Autoría de las evoluciones* más abajo. No hay FK de `Patient` a `Doctor` y no debe agregarse sin revisar esta decisión.

Cómo se implementa el aislamiento, en tres capas:

1. `TokenService` emite el claim `consultorio`; se lee con `User.GetConsultorioId()` (`HealthArchiveAPI/Extensions/ClaimsPrincipalExtensions.cs`). Si falta el claim (token viejo), el controller responde 403 en vez de servir sin filtrar.
2. **Los repositorios reciben el `consultorioId` y filtran ellos**, no los controllers: así un endpoint nuevo no puede olvidarse. Por eso `IPatientRepository` no expone ningún `GetPatients()` sin scope. La excepción documentada es `IDoctorRepository.GetDoctorForAuth(id)`, que usa la autenticación cuando todavía no hay consultorio de contexto.
3. Para lo que llega por GUID en la ruta (`hceId`, `evolutionId`), filtrar el listado no alcanza: hay que llamar a `IHceRepository.BelongsToConsultorio` / `IEvolutionRepository.BelongsToConsultorio`. **Todo endpoint nuevo que reciba uno de esos ids tiene que hacerlo**, y devolver 404 (no 403) para no confirmar que el recurso existe.

`HCE`, `Evolution` y `HCEFile` **no** llevan `ConsultorioId` propio: lo heredan por `HCE → Patient`. No agregar la columna — sería una segunda fuente de verdad.

El **DNI es único por consultorio** (índice compuesto `(ConsultorioId, DNI)`), no global: dos consultorios pueden atender al mismo paciente. El **email de doctor sí es global**, porque es la credencial de login.

Consecuencia del modelo: **el registro es el perímetro**. De ahí los controles que existen:

- **El código de alta vive hasheado en `Consultorio.CodeHash`**, con el mismo `IPasswordHasher` que las contraseñas. Como el hash lleva salt no se puede resolver el consultorio con una query, así que **`DoctorController.CreateDoctor` escanea**: `IConsultorioRepository.GetConsultoriosWithCode()` y un `Verify` por consultorio. El registro se valida **solo con el código** — no hay desplegable de consultorios y `DoctorRegisterDto` no lleva `ConsultorioId`. Tres consecuencias que hay que tener presentes:
  - Cuesta un PBKDF2 (~100k iteraciones) por consultorio con código, en cada intento. Está acotado por la política `"auth"` del rate limiter y por ser una operación rara. Si algún día hay decenas de consultorios, la salida es una columna de lookup determinística (HMAC con clave del server) **además** del hash con salt, no escanear más rápido.
  - Si el código coincide con más de un consultorio se **rechaza** (`ambiguous_code`) y se loguea como `Error`. Nada impide que dos consultorios compartan código —con salt no se puede validar unicidad al escribirlo— y elegir uno en silencio metería al doctor en el consultorio equivocado, que es justo la fuga que evita todo el modelo de aislamiento.
  - `GET /api/Consultorio/GetConsultorios` volvió a requerir autenticación: sin el desplegable no le queda consumidor anónimo, y así no se pueden enumerar los nombres de los consultorios desde afuera.
- `Registration:ConsultoryCode` quedó como **secreto de bootstrap**: solo lo usa el seeder de `Program.cs` para completar el código del consultorio inicial que crea la migración `Consultorios` (Guid fijo `11111111-...`). Es idempotente: no pisa un código rotado después desde la API. El fail-fast de Production sigue vigente.
- Consultorios nuevos se crean con `POST /api/Consultorio/CreateConsultorio`, solo `Admin`.

#### Autoría de las evoluciones

**Una evolución solo la puede editar el doctor que la creó** — tampoco un `Admin`. Es la única regla del sistema que restringe por persona y no por consultorio: el resto del modelo es de equipo, pero una evolución es la palabra de un profesional sobre un paciente y nadie más la firma.

- `Evolution.CreatedByDoctorId` (`Guid?`) es el ancla. FK a `Doctors` con `OnDelete(SetNull)`: dar de baja a un doctor no puede bloquearse por sus evoluciones ni arrastrarlas; la evolución sobrevive sin autor y la firma de `EvolutionInfo` queda intacta.
- **`null` significa "no la edita nadie"**, y es el estado de todas las evoluciones anteriores a la migración `EvolutionAuthorAndDates` (incluidas las traídas de SQL Server). Se decidió **no** backfillear el autor por matrícula: adivinar quién escribió una evolución clínica es peor que dejarla de solo lectura.
- `UpdateEvolution` devuelve **403 con slug `not_evolution_author`**, no 404: a esa altura ya se confirmó que la evolución existe y es del consultorio, así que negarlo no oculta nada. Va envuelto en `SerializableError` — `StatusCode(403, ModelState)` a secas serializa los internals del `ModelStateDictionary` y el `extractSlug` del cliente no encuentra el slug.
- **`UpdateEvolution` ya no reasigna `EvolutionInfo`.** Antes la pisaba con la firma del que editaba y borraba al autor original; como ahora el que edita es siempre el autor, no hay nada que reescribir.
- El botón "Editar" del front compara `CreatedByDoctorId` contra `store.Professional.id` (de ahí el `Id` en `AuthUserDto`). Es solo para no ofrecer una acción que va a dar 403 — **la regla la impone el backend**.

#### Fechas de la evolución

`CreatedDate` es la fecha de alta y no cambia nunca; `ModifiedDate` es la de la última edición. `EvolutionRepository.CreateEvolution` asigna **las dos con la misma variable**, así "nunca editada" es la comparación exacta `CreatedDate == ModifiedDate` y la UI no tiene que tolerar milisegundos de diferencia. La migración backfilleó `CreatedDate = ModifiedDate` en las filas viejas.

Ojo con las zonas horarias: se guardan en UTC sobre `timestamp without time zone` (por `EnableLegacyTimestampBehavior`), así que el JSON sale **sin la `Z`** y `new Date(...)` en el browser lo leería como hora local — en UTC-3 eso corre el día. Por eso el front las parsea con `parseApiTimestamp` (`Functions/DateUtils.ts`), no con `new Date` pelado.

#### Coberturas médicas

`Patient.MedicalCoverages` es una colección `OwnsMany` en la tabla `PatientMedicalCoverages`. **La cobertura de `Order == 0` es la principal**: es la que muestra el listado de pacientes (las demás se resumen como `+N`); la HCE las muestra todas. El `Order` que mande el cliente se ignora — `PatientMapper.ApplyTo` lo reasigna por posición en el array, así la invariante no depende del front, y descarta las filas totalmente vacías.

> **Ojo con `tools/migracion-postgres/`:** escribe directo en las columnas viejas `Patients.MedicalCoverage_*`, que la migración `MultipleMedicalCoverages` elimina. Si hay que volver a correr esa herramienta, tiene que ser **antes** de aplicar la migración: el `INSERT … SELECT` del `Up()` arrastra las coberturas a la tabla nueva.

#### Borrado de adjuntos

`DELETE /api/Hce/DeleteFile/{fileId}` lo puede usar **cualquier doctor del consultorio**, no solo quien lo subió: `HCEFile` no registra al que carga el archivo y el modelo del consultorio es de acceso compartido. Es la diferencia deliberada con las evoluciones. `HceRepository.DeleteFile` usa `ExecuteDelete()` en vez del `Remove`+`Save` del resto del repo, para no materializar en memoria un `byte[]` de decenas de MB solo para borrarlo.

> **Deuda conocida — `ConsultorioController` no respeta el aislamiento.** `CreateConsultorio` y `UpdateConsultorio` piden rol `Admin` pero no comparan contra `User.GetConsultorioId()`, así que un Admin del consultorio A puede renombrar o rotarle el código al consultorio B. Es la única parte del sistema que queda fuera del modelo de aislamiento. Se dejó así deliberadamente (2026-08-02) mientras haya un solo operador. **Antes de que existan administradores distintos por consultorio hay que cerrarlo**, y no alcanza con agregar el chequeo en `UpdateConsultorio`: falta decidir quién puede *crear* consultorios, porque un Admin de consultorio no debería, y hoy no existe un rol de sistema por encima (`Doctor.Role` solo tiene `"Doctor"` y `"Admin"`). El detalle está comentado en el propio controller.
- `Doctor.Password` lleva `[JsonIgnore]`. Varios endpoints devuelven la entidad `Doctor` completa; el atributo protege a todos de una sola vez, presente y futuro. **No quitarlo.**
- `DoctorController.CanActOn()` — un doctor solo se edita/borra a sí mismo; para tocar a otro hace falta `Admin`. Los pacientes, en cambio, no llevan chequeo de pertenencia a propósito (ver decisión de arriba).
- Rate limiting global (100/min por IP) y política `"auth"` (10/min) sobre `Login`, `Refresh` y `CreateDoctor`, que son los tres anónimos. Particiona por IP, lo que **depende de `UseForwardedHeaders`**; y `UseRateLimiter()` va después de `UseCors` para que los 429 lleguen al browser como 429 y no como error de CORS.

RLS de Postgres está desactivado y no aplica acá: la app se conecta con un único rol dueño de las tablas (que bypasea RLS), la conexión no lleva identidad de usuario, y no hay columna de pertenencia sobre la cual filtrar.

### Observabilidad

Todo con el `ILogger` que trae .NET: **no hay ni debe haber paquetes de logging** (misma razón por la que se sacaron AutoMapper y EF Tools). Los formatters de consola son parte del framework.

- **`Middleware/ExceptionHandlingMiddleware`** — el más externo. Fija el correlation id (respeta el header `X-Correlation-Id` entrante o genera uno), lo devuelve en la respuesta, y convierte las excepciones no manejadas en un `ProblemDetails` 500 con ese id. El detalle de la excepción solo se incluye en Development: en prod puede filtrar nombres de tablas o datos de pacientes.
- **`Middleware/RequestLoggingMiddleware`** — una línea estructurada por request con `Method`, `Path`, `StatusCode`, `ElapsedMs`, `ClientIp`, `DoctorId`, `ConsultorioId`, `UserAgent` y `CorrelationId`. Nivel `Warning` para 4xx/5xx y para >1000 ms, `Information` para el resto, `Debug` para `/health*` (el healthcheck de Railway pega cada pocos segundos y si no ahoga todo lo demás). Además abre un `BeginScope` con el correlation id, así **todas** las líneas del request lo llevan.
- **Orden en el pipeline:** `UseForwardedHeaders` → `ExceptionHandling` → `RequestLogging` → `UseCors` → `UseRateLimiter` → … Los dos van antes que CORS y el rate limiter a propósito, para que los 429 y los rechazos de CORS también queden logueados; la IP ya es la real gracias a `UseForwardedHeaders`.
- **Eventos de seguridad:** login fallido, refresh con token desconocido/inactivo, código de consultorio incorrecto o ambiguo, `OnRejected` del rate limiter, los `BelongsToConsultorio` que devuelven 404 (`HceController`/`EvolutionController`), y los intentos de editar una evolución ajena (`not_evolution_author`). **Nunca se loguean contraseñas ni códigos de consultorio** — sí el email y la IP, que son lo que permite reconocer una fuerza bruta.
- **Formato:** `AddJsonConsole` en Production (Railway lo muestra tal cual y deja filtrar por campo) y `AddSimpleConsole` en Development. El simple console imprime los scopes con `ToString()` y queda ilegible, por eso ahí van apagados; el correlation id igual viaja dentro de la propia línea del request log.
- **Niveles:** `appsettings.Production.json` deja `Default: Warning` pero sube `"HealthArchiveAPI": "Information"`. Sin esa línea el log de requests no se vería en producción. **Un logger nuevo tiene que colgar del namespace `HealthArchiveAPI`** o queda silenciado.
- **`/health`** es superficial a propósito (Railway lo consulta seguido, no conviene una query por ping). Para diagnóstico manual está **`/health/db`**, que hace `CanConnect()` y devuelve 503 si la base no responde.
- Los `$0.01/hora` de Railway son el costo base del container encendido, no tráfico: se factura por recursos asignados. Para confirmarlo, filtrar los logs por status 404 y 429 — el escaneo automatizado aparece como 404 contra rutas que no existen (`/.env`, `/wp-login.php`).

### Deploy

API en **Railway** (container Docker, `api/HealthArchiveAPI/Dockerfile`, Root Directory = `api/HealthArchiveAPI`) + Postgres de Railway; front en **Vercel** (Root Directory = `web-app`, config en `web-app/vercel.json`). Procedimiento completo y troubleshooting en `docs/deploy.md`.

Lo que `Program.cs` hace específicamente para ese entorno: bindea Kestrel a `$PORT` si existe; traduce `DATABASE_URL` (URI de Railway) al formato key=value de Npgsql cuando no hay `ConnectionStrings:DbContext`; `UseForwardedHeaders` con `KnownProxies`/`KnownNetworks` limpios (el proxy no tiene IP fija); `UseHttpsRedirection` y Swagger quedan **solo en Development** (en prod el TLS lo termina el proxy); expone `/health` sin auth para el healthcheck; y aplica migraciones al arrancar si `RunMigrationsOnStartup=true` (default `false`).

## Frontend architecture

- **Entry/routing:** `pages/App/App.tsx` wires `react-router` v6. `/`, `/Login` y `/Register` cuelgan de `<PublicGuard>`; Pacientes, Profesionales e HistoriaClinica, de `<AuthGuard>`.
- **Auth state:** hay **un solo predicado de sesión**, `store.Session.status` (`'checking' | 'authenticated' | 'anonymous'`, en `Redux/States/session.ts`), y lo usan `AuthGuard`, `PublicGuard` y `NavBar`. **No volver a decidir por campos de `Professional`** (`name`, `tuition`, …): se hidratan sincrónicamente desde localStorage y no distinguen "hay sesión" de "todavía no sabemos" — de ahí venían el navbar de "Cerrar Sesión" sobre el Login y el no redirigir a Pacientes estando logueado. `pages/App/AuthBootstrap.tsx` **envuelve la app**: muestra un `Spinner` mientras `status === 'checking'` y recién renderiza rutas y navbar cuando `/api/AuthService/Me` contestó. También registra el `setAuthFailureHandler` de `client.ts` para limpiar Redux y volver al Login por router en vez de recargar la página. El token real vive en una **cookie httpOnly que el JS nunca lee** y cada request se valida en el server; esto es solo la puerta del cliente.
- **State:** Redux Toolkit, store único en `Redux/Store.ts` con dos slices: `Professional` (espeja el `AuthUserDto` del backend — `name`, `lastName`, `email`, `tuition`, `role` — y persiste en localStorage) y `Session` (arriba, **no** se persiste).
- **API access:** All HTTP goes through `src/api/client.ts` — thin typed wrappers (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiPostFile`) over `fetch`. Every call sends `credentials: 'include'` (cookies); on a 401 the client attempts a single `/Refresh` then retries, and on failure clears the session and redirects to Login (`apiFetch` acepta `{ redirectOnAuthFailure: false }` para el `/Me` del arranque, donde un 401 es un resultado esperado). Los helpers tipados tiran **`ApiError`**, que conserva `status`, `body` y el `slug` del ModelState — así los códigos del backend (`doctor_exists`, `incorrect_code`) llegan a la UI. Ojo: ASP.NET serializa el ModelState de dos formas (`{ error: [...] }` plano desde `BadRequest(ModelState)` explícito, `{ errors: { error: [...] } }` desde la validación automática del `[ApiController]`) y `extractSlug` contempla las dos. Base URL comes from `import.meta.env.VITE_API_URL`. Add new calls here rather than calling `fetch` directly.
- **Logging y errores:** `src/lib/logger.ts` es el único canal — **no usar `console.*` directo**. En producción solo pasan `warn`/`error`; siempre guarda las últimas 50 entradas en un ring buffer accesible como `window.__haLogs()` para soporte. `setupGlobalErrorHandlers()` (llamado desde `index.tsx`) captura `error` y `unhandledrejection`, y `components/ErrorBoundary` envuelve las rutas para que una excepción de render no deje la pantalla en blanco. **Los logs no salen del navegador**: mandarlos al API implicaría un endpoint anónimo de escritura y más requests facturadas.
- **Fechas:** `components/DateField` reemplaza a los `<input type="date">` nativos — input escribible `dd/mm/aaaa` con máscara más un popover de calendario con salto directo de mes y año (imprescindible para fechas de nacimiento). El popover se renderiza con `createPortal` sobre `document.body` en `position: fixed` (z-index 1055, entre `.ha-modal` 1050 y `ConfirmDialog` 1060) **porque `.ha-modal` tiene `overflow-y: auto` y recortaría cualquier hijo posicionado**; la posición se acota al viewport y se remide con el alto real, que cambia según el mes. Los helpers viven en `Functions/DateUtils.ts` y trabajan **siempre en hora local**: parsear `'yyyy-MM-dd'` con `new Date(...)` lo toma como UTC y en UTC-3 corre la fecha un día. `Patient.BirthDate` es `Date | null`.
- **Env:** vars must be prefixed `VITE_`. `.env.development` is committed and holds the local default (`VITE_API_URL=https://localhost:7217`, the `dotnet run` https profile); override it in `.env.local` (gitignored) if your API listens elsewhere — e.g. `https://localhost:44393` for IIS Express. There is **no committed `.env.production`**: on Vercel the value is a project Environment Variable, and `vite.config.ts` throws if it's missing from a production build. See `.env.example`.
- **Pages** live in `src/pages/<Feature>/`, each co-located with its `.scss` (Sass) and an `index.ts` barrel. Bootstrap 5 is the CSS base.
- Rich text uses `draft-js`; PDF export uses `jspdf` + `html2canvas`.

Gotchas:
- **No sacar los `notranslate` / `translate="no"`.** El traductor automático del navegador reescribe el texto de las evoluciones, y como el editor es un `contentEditable`, draft-js toma lo traducido como si lo hubiera tipeado el médico y lo **persiste**: así una sigla `BIRD` (bloqueo incompleto de rama derecha) terminó guardada como "pájaro". La defensa está en cuatro lugares: el `<meta name="google" content="notranslate">` de `index.html`, el wrapper del `<Editor>` en `TextEditor.tsx` (el crítico, es por donde entra a la base), `.hce-evolution-note` y el `<div>` de `PrintHCE` (html2canvas fotografía el DOM vivo, así que hornearía la traducción en el PDF). Además `FormEvolucion` corta el guardado si detecta la página traducida (`Functions/isPageTranslated.ts`), como red de seguridad. Por la misma razón **`web-app/public/index.html` se borró**: era un resto de CRA con `<html lang="en">` que Vite copiaba a `dist/`.
- `convertJsonToHtml` **no tira** ante notas que no sean JSON de draft-js (las hay migradas y en seeds viejos): las muestra como texto escapado. Antes reventaba y, como el `.map()` de `fetchClinicHistory` no lo atrapaba, una sola evolución mal formada dejaba la historia clínica entera en blanco.
- `vite.config.ts` injects `define: { global: 'globalThis' }` because `draft-js` references the webpack-era `global`. Removing it crashes the app.
- CRA has been replaced by Vite; use `import.meta.env`, not `process.env`. Do not propose migrating to Next.js — that was evaluated and rejected (see project memory `frontend-react-vite-decision`).
