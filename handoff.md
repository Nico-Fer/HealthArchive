# Handoff — incidente Railway + cierre de sesión (branch `claude/kind-goodall-kd94rr`)

> Archivo de trabajo para retomar en otra sesión. **Borrarlo antes de mergear.**

## Qué se está haciendo

1. **Respuesta al incidente de Railway (21-oct-2026)**: se filtraron env vars → `DATABASE_URL`/credenciales
   de Postgres (que tiene la conexión pública activa), `Jwt__Key` y `Registration__ConsultoryCode`.
   Medidas en código: refresh tokens hasheados + migración que revoca todas las sesiones, el código de
   alta deja de ser obligatorio en Railway una vez sembrado, política mínima de contraseña y
   "Cambiar contraseña".
2. **Cierre de sesión al cerrar la última pestaña** de la app.
3. **Cierre por inactividad a las 2 h**, con aviso 2 min antes. Antes nunca existió: el refresh token
   duraba 7 días deslizantes y las cookies eran persistentes.

Decisiones ya tomadas con el usuario (no volver a preguntar):
- Multi-pestaña: la sesión se cierra al cerrar la **última** pestaña; abrir otra pestaña no pide login.
- Aviso de inactividad **2 min antes** con "Seguir conectado".
- **Sí** se agrega "Cambiar contraseña".

## Diseño (resumen)

- **Server = autoridad.** `Session:IdleTimeoutMinutes` (120). El refresh token vence a ahora + 120 y
  se corre en cada `/Refresh` (rotación) y en `POST /api/AuthService/KeepAlive` (sin rotar).
  Cookies de sesión (sin `Expires`). `Logout` es `[AllowAnonymous]`.
- **Front = UX.** `src/lib/session.ts`: "último toque" en localStorage (`ha-session-touched-at`, =
  último KeepAlive enviado) compartido entre pestañas; flag de pestaña en sessionStorage
  (`ha-tab-session`); `BroadcastChannel('ha-session')` para ping/pong ("¿hay otra pestaña con
  sesión?") y para propagar el logout. `IdleWatcher` manda KeepAlive ante actividad cada ≥5 min,
  avisa a los 118 min y cierra a los 120. `AuthBootstrap`: sin flag de pestaña y sin otra pestaña
  viva → `/Logout` y anónimo.

## Estado por bloque

| # | Bloque | Estado |
|---|---|---|
| 1 | Backend: refresh tokens hasheados + migración `HashRefreshTokens` | ✅ hecho, compila |
| 2 | Backend: inactividad, KeepAlive, Logout anónimo, ChangePassword, seeder, política de contraseña | ✅ hecho, compila |
| 3 | Front: sesión por pestaña + IdleWatcher (`lib/session.ts`, `pages/App/IdleWatcher.tsx`, `AuthBootstrap`, slice `Session.endedReason`, Login) | ✅ hecho, `tsc` + `vite build` OK; falta E2E en browser |
| 4 | Front: ChangePasswordForm, NavBar, Register (`weak_password`) | ⏳ pendiente |
| 5 | Docs: `CLAUDE.md` + `docs/deploy.md` (runbook de rotación) | ⏳ pendiente |

## Verificación hecha / pendiente

- Backend: `dotnet build` OK (SDK 10.0.113 del archivo de Ubuntu; **`global.json` pide 10.0.301**, así
  que se compiló en una copia fuera del repo). Migración generada con `dotnet-ef` 10.0.0.
- Backend probado contra Postgres 16 local (apt `postgresql`): la migración hashea en el mismo formato
  que C# y revoca todo; con `Session__IdleTimeoutMinutes=1` se verificó Login/Me/KeepAlive/Refresh,
  vencimiento por inactividad (401 + log Information), ChangePassword (400 `incorrect_password`/
  `weak_password`, revoca otras sesiones), Logout sin access token, cookies sin `Expires`, y el
  fail-fast de Production del código de consultorio (corta solo si el inicial no tiene código).
- Front: `npx tsc --noEmit` y `vite build` OK.
- Pendiente: E2E del front en browser (Playwright) contra la API local.

## Cómo compilar en un container sin el SDK 10.0.3xx

```bash
apt-get install -y dotnet-sdk-10.0          # trae 10.0.1xx
cp -r api/HealthArchiveAPI /tmp/build-api    # fuera del repo, para que no aplique global.json
cd /tmp/build-api && dotnet build HealthArchiveAPI.sln
```

## Pasos manuales para el usuario (fuera del código)

Ver el plan completo; resumen: auditar (Doctors/Admins, RefreshTokens desde el 21-oct, logs de
Railway) → regenerar password de Postgres y apagar su TCP proxy público → `Jwt__Key` nueva → rotar
`RAILWAY_TOKEN` de GitHub → deployar con `RunMigrationsOnStartup=true` → rotar códigos de consultorio
con `UpdateConsultorio` y borrar `Registration__ConsultoryCode` → pedir a los doctores que cambien la
contraseña.
