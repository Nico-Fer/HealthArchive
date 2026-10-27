# Handoff — incidente Railway + cierre de sesión (branch `claude/kind-goodall-kd94rr`)

> Archivo de trabajo para retomar en otra sesión. **Borrarlo antes de mergear.**

## Estado: código terminado y verificado. Falta lo manual (abajo).

| # | Bloque | Estado |
|---|---|---|
| 1 | Backend: refresh tokens hasheados + migración `HashRefreshTokens` | ✅ probado contra Postgres 16 |
| 2 | Backend: inactividad (`Session:IdleTimeoutMinutes`), `KeepAlive`, `Logout` anónimo, `ChangePassword`, seeder, `PasswordPolicy` | ✅ probado con curl |
| 3 | Front: sesión por pestaña + `IdleWatcher` (`lib/session.ts`, `AuthBootstrap`, `Session.endedReason`, Login) | ✅ probado en Chromium (Playwright) |
| 4 | Front: `ChangePasswordForm` en el perfil propio, NavBar → perfil, Register (`weak_password`) | ✅ probado en Chromium |
| 5 | Docs: `CLAUDE.md` (sección *Cierre de sesión*) + `docs/deploy.md` sección 7 (runbook de rotación) | ✅ |

Decisiones tomadas con el usuario (no volver a preguntar): la sesión se cierra al cerrar la
**última** pestaña; aviso de inactividad **2 min antes**; **sí** "Cambiar contraseña".

## Qué se verificó

- `dotnet build` OK. Ojo: `global.json` pide SDK 10.0.301 y el container solo consigue 10.0.113 por
  apt, así que se compiló en una copia fuera del repo (`cp -r api/HealthArchiveAPI /tmp/x`).
- Migración contra Postgres 16 local: hashea en el mismo formato que C# (SHA-256 base64) y revoca todo.
- API con `Session__IdleTimeoutMinutes=1`: Login/Me/KeepAlive/Refresh, vencimiento por inactividad,
  ChangePassword (slugs + revoca otras sesiones), Logout sin access token, cookies sin `Expires`,
  fail-fast de Production del código de consultorio (solo si el inicial no tiene código).
- Front: `tsc --noEmit` y `vite build` OK; E2E en Chromium de pestañas, inactividad (con reloj
  simulado), logout propagado entre pestañas y cambio de contraseña.
- **No** se probó contra Railway/Vercel reales ni en Safari/Firefox.

## Pendiente: pasos manuales (detalle en `docs/deploy.md` §7)

1. Auditar ANTES de deployar (SQL en el runbook + logs de Railway).
2. Postgres: regenerar contraseña y quitar el TCP Proxy público; redeployar la API.
3. `Jwt__Key` nueva.
4. Rotar el Project Token de Railway y el secret `RAILWAY_TOKEN` de GitHub.
5. Deployar este branch con `RunMigrationsOnStartup=true` (todos vuelven a loguearse).
6. Rotar los códigos de consultorio con `UpdateConsultorio` y **borrar** `Registration__ConsultoryCode`.
7. Pedir a los doctores que cambien la contraseña (clic en su nombre ▸ Cambiar contraseña).

## Fuera de alcance, detectado al compilar

`System.Security.Cryptography.Pkcs` 9.0.0 (transitiva de `HealthArchiveAPI`) tiene un advisory High
(GHSA-846f-f764-76mx). No lo trae este cambio; conviene resolverlo aparte.
