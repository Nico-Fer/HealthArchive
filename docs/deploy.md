# Deploy — API en Railway + Front en Vercel

Arquitectura: la API (.NET 10) corre en **Railway** junto a un **Postgres de Railway**,
y el SPA (React + Vite) en **Vercel**. Se hablan por HTTPS cross-domain; la sesión
viaja en cookies `HttpOnly` `Secure` `SameSite=None`, así que **ambos lados tienen
que estar en HTTPS** o el browser descarta la cookie.

```
[ Vercel ]  https://<app>.vercel.app          (SPA, VITE_API_URL apunta al API)
    │  fetch con credentials: 'include'
    ▼
[ Railway ] https://<api>.up.railway.app      (ASP.NET Core, container Docker)
    │  red interna
    ▼
[ Railway ] postgres.railway.internal:5432    (Postgres administrado)
```

> ### Costo: Railway no tiene free tier sostenido
>
> Vercel Hobby sí es gratis. Railway **no**: da un **trial de $5 por única vez**
> (30 días, sin tarjeta), y después pasás a un plan Free con ~$1 de crédito mensual,
> que no alcanza para tener la API prendida. Hobby son $5/mes y es *mínimo de gasto*,
> no crédito: si consumís menos, pagás $5 igual.
>
> Por eso existe el workflow de la sección 6: para bajar la API cuando no la estás
> usando y estirar el crédito del trial. **El Postgres no se puede pausar**, así que
> su almacenamiento sigue consumiendo aunque la API esté abajo.
>
> Si en algún momento querés $0 sostenido, la alternativa es Render (free, con
> spin-down a los 15 min y cold start de 30-60s) + Neon (free, scale-to-zero) para
> Postgres. El Dockerfile sirve igual; solo cambia dónde se cargan las env vars.

---

## 0. Cómo se separan los ambientes

**Backend** — `appsettings.json` es la base común (sin secretos ni URLs) y encima se
aplica `appsettings.{ASPNETCORE_ENVIRONMENT}.json`:

| | Development (local) | Production (Railway) |
|---|---|---|
| Lo setea | `launchSettings.json` | `ENV ASPNETCORE_ENVIRONMENT=Production` en el Dockerfile |
| Conexión a la base | `ConnectionStrings:DbContext` en **user-secrets** | `DATABASE_URL` (env var) |
| `Jwt:Key` | user-secrets | `Jwt__Key` (env var) |
| CORS | `localhost:3000` / `4173`, fijo en el JSON | `Cors__AllowedOrigins` (env var) |
| Swagger | montado | apagado |
| Redirección a https | sí | no (la termina el proxy) |
| Logging | `Information` + SQL de EF | `Warning` |
| Migraciones | a mano con `dotnet ef database update` | `RunMigrationsOnStartup=true` |

Al arrancar en Production, `Program.cs` valida que `Jwt:Key` tenga ≥32 bytes y que
`Cors:AllowedOrigins` no esté vacío: si falta alguna, tira excepción y el deploy
falla de entrada en vez de romper request por request.

**Frontend** — Vite resuelve `VITE_API_URL` con esta prioridad:

1. variables de entorno del proceso → **es lo que usa Vercel**
2. `.env.local` → override personal, no se versiona
3. `.env.development` → default local versionado (`https://localhost:7217`)

No hay `.env.production` versionado a propósito: la URL del API de Railway vive solo
en Vercel. Si falta en un build de producción, `vite.config.ts` corta el build con un
error en vez de generar un bundle con `undefined` como base URL.

---

## 1. Railway — API

**Crear el servicio**

1. New Project → Deploy from GitHub repo → elegir este repo.
2. En el servicio, **Settings ▸ Root Directory** = `api/HealthArchiveAPI`.
   Railway detecta el [`Dockerfile`](../api/HealthArchiveAPI/Dockerfile) de ese
   directorio y lo usa (ignora Nixpacks, que no cubre .NET 10).
3. **Settings ▸ Healthcheck Path** = `/health`.

**Agregar el Postgres**

4. En el mismo proyecto: New → Database → PostgreSQL.
5. En el servicio de la API, referenciar la variable del Postgres:
   `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.
   `Program.cs` traduce ese URI al formato key=value que espera Npgsql
   (usa la red interna, sin costo de egress).

**Variables de entorno del servicio API**

| Variable | Valor | Nota |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | referencia al servicio Postgres |
| `Jwt__Key` | clave random | **≥ 32 bytes**, o el firmado HMAC tira excepción al arrancar |
| `Jwt__Issuer` | `HealthArchive` | opcional, hay default en `appsettings.json` |
| `Jwt__Audience` | `HealthArchiveClient` | opcional |
| `Cors__AllowedOrigins` | `https://<app>.vercel.app` | CSV; **sin barra final** |
| `Registration__ConsultoryCode` | código de alta | **obligatoria**: sin ella la app no arranca. Ver abajo |
| `Cookies__Secure` | `true` | |
| `Cookies__SameSite` | `None` | requerido para cross-domain |
| `RunMigrationsOnStartup` | `true` | ver abajo |

> ⚠️ **`Registration__ConsultoryCode` hay que setearla ANTES de deployar** la versión que
> la introduce. `Program.cs` valida en Production que no esté vacía y tira excepción si
> falta, igual que con `Jwt__Key`: si deployás primero, la API no levanta.
>
> Es el código que pide `/Register` para dar de alta un doctor. Antes estaba hardcodeado
> como `"1234"` en el código fuente, o sea público en el repo. **Es el único perímetro del
> sistema**: cualquier doctor registrado ve todas las historias clínicas, así que elegí un
> valor que no sea adivinable y no lo compartas de más.

Generar la clave JWT (PowerShell):

```bash
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

> `PORT` lo inyecta Railway solo; `Program.cs` lo lee y bindea Kestrel a `0.0.0.0:$PORT`.
> No hace falta setearla a mano.

**Migraciones**

Con `RunMigrationsOnStartup=true`, la app corre `Database.Migrate()` al arrancar y
crea el esquema en el primer deploy. Una vez aplicado se puede pasar a `false`
(o dejarlo prendido y que cada deploy aplique lo pendiente — es idempotente).

**Datos iniciales**

La base arranca vacía. Para crear el primer doctor, usar `/Register` desde el front con el
valor de `Registration__ConsultoryCode` (esa ruta hashea la password). Los `seed_*.sql` del
repo tienen passwords en texto plano y **no sirven para loguearse** con el hashing actual.

**Designar un administrador**

Un doctor común solo puede editarse o borrarse a sí mismo; para administrar a otros hace
falta el rol `Admin`. No hay UI para asignarlo, es un UPDATE directo:

```sql
UPDATE "Doctors" SET "Role" = 'Admin' WHERE "Email" = 'tu@email.com';
```

El rol viaja dentro del JWT, así que **el doctor tiene que cerrar sesión y volver a
entrar** para que el cambio tenga efecto.

---

## 2. Vercel — Front

1. Import Project → este repo.
2. **Root Directory** = `web-app`. El resto (framework, build command, output dir,
   rewrite SPA) lo toma de [`web-app/vercel.json`](../web-app/vercel.json).
3. **Environment Variables** → `VITE_API_URL = https://<api>.up.railway.app`
   (sin barra final). Vite embebe el valor en build time: si la cambiás,
   hay que **redeployar**, no alcanza con reiniciar.

El `rewrite` de `vercel.json` manda todo a `index.html`; sin eso, recargar en
`/Pacientes` o cualquier ruta de react-router devuelve 404.

---

## 3. Orden de deploy (hay dependencia circular)

Cada lado necesita la URL del otro, así que va en dos pasadas:

1. Deployar la API en Railway con `Cors__AllowedOrigins` provisorio.
2. Deployar el front en Vercel con `VITE_API_URL` = URL real de Railway.
3. Volver a Railway, poner `Cors__AllowedOrigins` = URL real de Vercel → redeploy.

Si después agregás un dominio propio, hay que sumarlo al CSV de
`Cors__AllowedOrigins` (los preview deployments de Vercel tienen URL distinta en
cada push: o los agregás, o simplemente no van a poder llamar al API).

---

## 4. Verificación post-deploy

- [ ] `GET https://<api>.up.railway.app/health` → `{"status":"ok"}`.
- [ ] En Railway, los logs no muestran excepción de arranque (típicas: `Jwt__Key`
      corta, o connection string ausente).
- [ ] La tabla `RefreshTokens` y la columna `Doctors.Role` existen en el Postgres.
- [ ] Registro desde el front → el doctor queda con `Password` hasheada.
- [ ] Login → DevTools ▸ Application ▸ Cookies: `access_token` y `refresh_token`
      con `HttpOnly` ✓ `Secure` ✓ `SameSite=None`, en el dominio de Railway.
- [ ] Navegar a `/Pacientes` → 200, y **recargar la página** ahí → sigue funcionando
      (verifica el rewrite de Vercel).
- [ ] Borrar cookies → los endpoints protegidos dan 401 y el front redirige a Login.
- [ ] Logout → cookies borradas y el refresh token queda revocado en la DB.

## 5. Troubleshooting

| Síntoma | Causa habitual |
|---|---|
| CORS error en el browser | `Cors__AllowedOrigins` no coincide **exacto** con el origin de Vercel (barra final, `http` vs `https`, preview URL distinta) |
| Login responde 200 pero la sesión no persiste | La cookie no se guardó: falta `Secure`/`SameSite=None`, o alguno de los dos lados no está en HTTPS |
| 502 / healthcheck falla en Railway | La app no bindeó a `$PORT`, o crasheó al arrancar (mirar logs: `Jwt__Key` < 32 bytes) |
| 404 al recargar una ruta del front | Falta el rewrite de `vercel.json` o el Root Directory no es `web-app` |
| `relation "Doctors" does not exist` | Nunca corrieron las migraciones → `RunMigrationsOnStartup=true` y redeploy |

---

## 6. Levantar y bajar la API desde GitHub Actions

Workflow: [`.github/workflows/railway-updown.yml`](../.github/workflows/railway-updown.yml).
Se corre a mano desde **Actions → "Railway: levantar / bajar la API" → Run workflow**,
eligiendo la acción en el desplegable.

| Acción | Qué hace |
|---|---|
| `up` | `railway up --ci` desde la **raíz del repo** (build + deploy) y después espera a que `/health` devuelva 200, hasta 5 minutos |
| `down` | `railway down --yes`, que elimina el último deployment del servicio |
| `status` | `railway status` + un GET a `/health`, sin tocar nada |

### Configuración previa (una sola vez)

1. En Railway: **Settings del proyecto → Tokens → New Token**, scope al environment
   `production`. Es un **Project Token**; los tokens de cuenta no sirven para deployar
   (esos van en `RAILWAY_API_TOKEN`, que este workflow no usa).
2. En GitHub: **Settings → Secrets and variables → Actions**
   - Secret `RAILWAY_TOKEN` = el token del paso 1.
   - Variable `RAILWAY_SERVICE` = el nombre del servicio de la API en Railway.
   - Variable `API_HEALTH_URL` = `https://<tu-api>.up.railway.app/health`.

Si falta algo, el primer step corta con un mensaje que dice exactamente qué.

### Qué esperar

- **La URL no cambia.** `railway down` borra el deployment, no el servicio, así que el
  dominio queda asignado y al volver a levantar sirve la misma URL. No hay que tocar
  `Cors__AllowedOrigins` ni `VITE_API_URL` entre un ciclo y otro.
- **El front sigue arriba.** Vercel Hobby es gratis, no hay razón de costo para bajarlo.
  Con la API abajo, el SPA carga pero cualquier llamada falla — es lo esperado.
- **El Postgres sigue arriba.** Railway no expone forma de pausarlo por API (la API
  pública no tiene mutación de stop/pause, y el CLI tampoco). Su almacenamiento sigue
  consumiendo crédito. Si querés cortar del todo, hay que borrar el servicio a mano
  desde el dashboard, y eso **borra los datos**.
- El `up` reconstruye la imagen en Railway, así que tarda lo que tarde el build de
  Docker — no son segundos.
- **El workflow sube el repo completo, no solo `api/`.** Es a propósito: las settings del
  servicio (Root Directory `api/HealthArchiveAPI` y Dockerfile Path) están expresadas
  relativas a la raíz, así que el snapshot tiene que arrancar ahí para que resuelvan. Es
  exactamente lo que manda la integración de GitHub. Si se corriera `railway up` desde
  `api/HealthArchiveAPI`, el build falla con
  `failed to read Dockerfile at 'api/HealthArchiveAPI/Dockerfile'`.
