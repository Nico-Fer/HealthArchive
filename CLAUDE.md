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
- Run API (Swagger at `/swagger`, https://localhost:7217): `dotnet run --project HealthArchiveAPI`
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
- The `JwtBearer` package is referenced but auth is **not** actually wired: there is no `AddAuthentication`/`UseAuthentication`, and `AuthServiceRepository.Authenticate` compares plaintext passwords. Treat the auth layer as unfinished, not as a security baseline.
- `seed_testdata.sql` / `seed_test_data.sql` exist for local data.

## Frontend architecture

- **Entry/routing:** `pages/App/App.tsx` wires `react-router` v6. Public routes (`/`, `/Login`, `/Register`) are open; everything under the `<AuthGuard>` layout route (Pacientes, Profesionales, HistoriaClinica) is protected.
- **Auth state:** `Guards/AuthGuard.tsx` gates routes on `store.Professional.name` from Redux — if empty, it redirects to Login. Auth is client-side only; there is no token.
- **State:** Redux Toolkit, single store in `Redux/Store.ts` with one `Professional` slice (`Redux/States/professional.ts`).
- **API access:** All HTTP goes through `src/api/client.ts` — thin typed wrappers (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `apiPostFile`) over `fetch`. Base URL comes from `import.meta.env.VITE_API_URL`. Add new calls here rather than calling `fetch` directly.
- **Env:** copy `.env.example` to `.env.local` and set `VITE_API_URL` (points at the running API). Vite env vars must be prefixed `VITE_`.
- **Pages** live in `src/pages/<Feature>/`, each co-located with its `.scss` (Sass) and an `index.ts` barrel. Bootstrap 5 is the CSS base.
- Rich text uses `draft-js`; PDF export uses `jspdf` + `html2canvas`.

Gotchas:
- `vite.config.ts` injects `define: { global: 'globalThis' }` because `draft-js` references the webpack-era `global`. Removing it crashes the app.
- CRA has been replaced by Vite; use `import.meta.env`, not `process.env`. Do not propose migrating to Next.js — that was evaluated and rejected (see project memory `frontend-react-vite-decision`).
