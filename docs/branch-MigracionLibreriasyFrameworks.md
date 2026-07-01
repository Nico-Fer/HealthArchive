# Branch `MigracionLibreriasyFrameworks` — Registro de cambios y decisiones

> Documento para futuras sesiones (humanas o de Claude). Resume **qué** cambió en
> esta branch respecto a `master`, **por qué**, las **decisiones de diseño** que se
> tomaron y la **visión a futuro**. Ante dudas, verificar siempre contra el código
> actual: este documento es una foto en el tiempo, no estado vivo.

Última actualización: 2026-07-01.

---

## 1. Objetivo de la branch

Modernizar HealthArchive en dos frentes, sin cambiar el comportamiento visible
para el usuario salvo mejoras concretas de UX:

1. **Bajar deuda técnica y vulnerabilidades** subiendo versiones de frameworks y
   reordenando el backend a Clean Architecture, y reemplazando CRA por Vite en el
   front.
2. **Mejoras de producto puntuales** que aparecieron durante el trabajo:
   paginación + búsqueda server-side de pacientes, borradores de evolución, y
   spinners de carga.

Contexto de las decisiones estratégicas vive en las memorias de proyecto
`modernization-plan` y `frontend-react-vite-decision` (ver §6).

---

## 2. Cambios ya commiteados (commit `2ea3b4a`, fases 1‑6)

### Backend (fases 1‑3)
- **Upgrade de plataforma:** .NET 10 LTS, EF Core 10, Swashbuckle 7.3.1,
  AutoMapper 13.0.0.
- **Reestructura a Clean Architecture** en cuatro proyectos con dependencias hacia
  adentro (`HealthArchiveAPI` → `Infrastructure` → `Application` → `Domain`):
  - `Domain`: entidades POCO y owned types (`Patient`, `Doctor`, `HCE`,
    `Evolution`, `HCEFile`, `Phone`, `MedicalCoverage`, `EvolutionInfo`).
  - `Application`: DTOs, interfaces `I*Repository`, perfiles AutoMapper `*Mapper`.
  - `Infrastructure`: `DBContextHealth`, implementaciones de repos, Migrations.
  - `HealthArchiveAPI`: Controllers + `Program.cs` (composition root).
- **SQL Server → PostgreSQL (Npgsql 10.0.0).** Se eliminaron todas las migraciones
  de SQL Server y se generó una única `InitialPostgres` (uuid, bytea,
  `timestamp without time zone`).
- **Connection string fuera del repo:** vía user-secrets; `appsettings.json` queda
  sin credenciales (intencionalmente vacío).
- **Fixes incidentales:** bug en `PatientMapper` (`CreateMap<Patient, PatientDto>`),
  y `EvolutionRepository` pasó a `DateTime.UtcNow`.

### Frontend (fases 5‑6)
- **CRA → Vite** + `@vitejs/plugin-react`.
- **Cliente HTTP central** en `web-app/src/api/client.ts` con `VITE_API_URL`; se
  reemplazaron 13 `fetch` inline por los wrappers tipados (`apiGet`, `apiPost`, …).
- **Bumps menores:** TypeScript 5.3.3 → 5.9.3, React 18.2.0 → 18.3.1,
  react-router-dom 6.22 → 6.30.4 (fix XSS), RTK 2.2.1 → 2.12.0,
  react-redux 9.1 → 9.3, Bootstrap 5.3.2 → 5.3.3. Se quitaron `@types/react-redux`
  y `@types/redux` (ya vienen con react-redux 9+).

---

## 3. Cambios sin commitear (working tree actual)

Trabajo en curso por encima del commit de modernización. Agrupado por feature.

### 3.1 Paginación + búsqueda server-side de pacientes
Motivación: `GetPatients` traía **toda** la tabla; con volumen real eso no escala.

- **Backend:**
  - `IPatientRepository`: nueva sobrecarga
    `GetPatients(int pageNumber, int pageSize, string? search)` que devuelve
    `(ICollection<Patient> Items, int TotalCount)`.
  - `PatientRepository`: implementación con `IQueryable`, búsqueda case-insensitive
    por nombre/apellido/DNI usando `EF.Functions.ILike`, orden estable
    (`OrderBy LastName, ThenBy Name`) y `Skip/Take`.
  - `PatientController.GetPatients`: acepta `pageNumber`, `pageSize`, `search` por
    query string; **cota defensiva** `pageSize` ∈ [1, 100] (default 30) y
    `pageNumber ≥ 1`. Devuelve `PagedResultDto<Patient>`.
  - `PagedResultDto<T>` (nuevo, en `Application/DTOs`): `Items`, `TotalCount`,
    `PageNumber`, `PageSize`, y `TotalPages` calculado.
- **Frontend:**
  - Tipo espejo `PagedResult<T>` en `web-app/src/Types/Paged.ts`.
  - Componente `Pacients/Pagination/PaginationControls.tsx`: ventana de máx. 5
    números con elipsis y botones Anterior/Siguiente (clases Bootstrap
    `pagination`); no renderiza nada si `totalPages <= 1`.
  - `Patients.tsx`: estado `page`/`totalPages`, recarga por cambio de página y
    **búsqueda con debounce de 350 ms** que reinicia a la página 1.
- **Datos de prueba:** `api/HealthArchiveAPI/seed_testdata.sql` (idempotente): 1
  doctor de login, 50 pacientes con HCE y evoluciones, para probar
  paginación/búsqueda.

### 3.2 Borradores de evolución (HCE) por paciente
Motivación: si el médico cierra el form o falla el guardado, no debe perder la nota.

- `web-app/src/Functions/hceDraft.ts` (nuevo): `read/save/clearHceDraft(dni)` sobre
  **`sessionStorage`** con clave `hce-draft:<DNI>`.
  - **Decisión clave:** `sessionStorage`, no `localStorage` — el borrador sobrevive
    a recargar/navegar pero **se borra al cerrar la pestaña**, para no dejar notas
    clínicas en disco en máquinas compartidas de consultorio.
  - Solo persiste si hay texto real (evita guardar por mover el cursor); tolera
    JSON inválido sin romper.
- `FormEvolucion.tsx`: recibe `patientDni`, inicializa el editor desde el borrador
  y guarda en cada cambio. **No** limpia el borrador al enviar.
- `TextEditor.tsx`: `hydrateEditorState(notes)` rehidrata draft-js desde el
  `rawContentState` serializado; si viene vacío/corrupto arranca en blanco.
- `HistoriaClinica.tsx`: `clearHceDraft(patient.DNI)` se llama **solo tras un POST
  exitoso**. Si el backend falla, el borrador queda intacto y se recupera al
  reabrir. Así lista y borrador quedan consistentes (nada de evoluciones
  "fantasma").

### 3.3 Spinners de carga (feature más reciente)
Motivación: durante los fetch, las vistas quedaban **en blanco** sin feedback.

- Componente reutilizable `web-app/src/components/Spinner/` (`Spinner.tsx` +
  barrel `index.ts`), basado en las clases nativas `spinner-border` de Bootstrap 5
  (sin dependencias nuevas); acepta un `label` opcional.
- Patrón aplicado en cada vista con fetch: estado `isLoading` que arranca en `true`,
  `setIsLoading(true)` al inicio del fetch y `setIsLoading(false)` en `finally`;
  render condicional del spinner vs. el contenido.
- Zonas cubiertas:
  - `Pacients/Patients.tsx` (lista; cubre también paginación y búsqueda).
  - `Professionals/Professionals.tsx` (lista de doctores).
  - `HistoriaClinica/HistoriaClinica.tsx` (barra lateral de evoluciones).
  - `Profesional/Componentes/FormProfesional.tsx` (form de edición de doctor).
  - `HistoriaClinica/PersonalInfo.tsx`: mejora menor, reemplaza el texto
    `Loading...` hardcodeado por `<Spinner />`.

### 3.4 Config e tooling
- `vite.config.ts`: `define: { global: 'globalThis' }`. **No remover** — draft-js
  referencia el `global` de la era webpack; sin esto la app crashea con
  "global is not defined".
- Carpetas `.github/skills/**` (raíz y `api/HealthArchiveAPI/.github/`): skills de
  agente (dotnet-webapi, ef-core, react-expert, typescript-pro, testing, etc.).
  Son material de apoyo para agentes; no son código de la app.

---

## 4. Decisiones de diseño (resumen del "por qué")

- **Repository pattern estricto:** los controllers dependen solo de `I*Repository`
  + `IMapper`, nunca de `DBContextHealth`. La paginación se resolvió con una
  **sobrecarga** de `GetPatients` en la interfaz, respetando ese contrato.
- **Paginación/búsqueda en el servidor**, no en el cliente: la query filtra y pagina
  en Postgres (`ILike` + `Skip/Take`), no se trae la tabla entera.
- **`sessionStorage` para borradores clínicos:** privacidad en equipos compartidos
  por encima de persistencia de largo plazo (ver §3.2).
- **Limpieza de borrador atada al éxito del POST**, no al submit local: evita perder
  datos ante fallos de red.
- **Spinner con Bootstrap nativo**, sin librería nueva: consistente con el resto de
  la UI y coste cero en dependencias.
- **AutoMapper congelado en 13/14:** v15+ pasó a licencia comercial. **No** subir a
  v15+; si hace falta, mapear a mano (dominio chico).
- **Npgsql legacy timestamp:** `Program.cs` setea
  `EnableLegacyTimestampBehavior = true` para mapear `DateTime` a `timestamp without
  time zone`. Marcado para remover cuando los repos pasen a async + UTC (fase 7).

---

## 5. Visión a futuro / pendientes

- **Fase 7 (backend):** repos async + `DateTime` en UTC; una vez hecho, quitar el
  switch legacy de Npgsql.
- **Auth real:** hoy no está cableada. `JwtBearer` está referenciado pero no hay
  `AddAuthentication`/`UseAuthentication`, y `AuthServiceRepository.Authenticate`
  compara contraseñas en texto plano. Tratar la capa de auth como **incompleta**,
  no como baseline de seguridad. Pendiente: hashing + JWT + guard server-side.
- **Front, opcionales evaluados y postergados:** React 19 y react-router 7 (no
  urgentes). **Next.js quedó descartado** para este repo (ver §6).
- **No hay proyecto de tests** en el backend ni runner de tests en el front (aunque
  `@testing-library/*` está en devDependencies). Candidato natural a futuro.
- **Bundle grande:** el build avisa que un chunk supera 500 kB; posible
  code-splitting con `import()` dinámico más adelante.

---

## 6. Referencias

- Memoria de proyecto `modernization-plan`: orden y alcance del bump de versiones,
  y la trampa de licencia de AutoMapper.
- Memoria de proyecto `frontend-react-vite-decision`: por qué React SPA + Vite y por
  qué **no** Next.js (app tras login, sin SEO/SSR; evita backend Node duplicado).
- `CLAUDE.md` (raíz): guía viva de arquitectura, comandos y gotchas del repo.
- Commit `2ea3b4a` "Modernización fases 1-6": detalle fase por fase del upgrade.
