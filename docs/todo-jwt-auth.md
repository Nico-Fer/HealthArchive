# TODO — Terminar de configurar la autenticación JWT

> Checklist de lo que **falta hacer en tu entorno** para dejar la auth 100% operativa.
> El **código ya está implementado** (backend + frontend compilan y la migración
> `AuthAndRoles` ya se aplicó a la base local). Lo que sigue son pasos de
> configuración, datos y verificación — no de código.

Última actualización: 2026-07-01.

---

## 1. Configuración local (obligatorio para que funcione)

- [ ] **Setear la clave de firma del JWT** vía user-secrets. Debe tener **≥ 32 bytes**
      o el firmado HMAC-SHA256 tira excepción al arrancar.
  ```bash
  # generar una clave aleatoria (PowerShell)
  [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))

  # setearla (desde api/HealthArchiveAPI/)
  dotnet user-secrets set "Jwt:Key" "<clave-generada>" --project HealthArchiveAPI
  ```
- [ ] **Confirmar el connection string** en user-secrets (`ConnectionStrings:DbContext`)
      — ya lo tenías para correr la app; solo verificá que apunta a la base correcta.
- [ ] **Verificar la migración aplicada**: la tabla `RefreshTokens` y la columna
      `Doctors.Role` deben existir. (Si trabajás en otra base, correr
      `dotnet ef database update --project HealthArchive.Infrastructure --startup-project HealthArchiveAPI`.)

## 2. Datos existentes

- [ ] Los doctores ya cargados tienen la **password en texto plano** → con el hash
      nuevo **ya no pueden loguearse**. Elegir una:
  - [ ] Re-registrarlos desde `/Register` (la ruta hashea automáticamente), **o**
  - [ ] Actualizar `seed_testdata.sql` / `seed_test_data.sql` con hashes válidos y re-seedear.
- [ ] (Opcional) Asignar `Role = 'Admin'` a algún doctor si vas a usar endpoints
      restringidos por rol (`UPDATE "Doctors" SET "Role" = 'Admin' WHERE ...`).

## 3. Verificación end-to-end (local)

- [ ] Levantar API (`dotnet run --project HealthArchiveAPI`) y front (`npm run dev`).
- [ ] **Registro**: crear un doctor → verificar en DB que `Password` quedó hasheado.
- [ ] **Login**: DevTools ▸ Application ▸ Cookies → `access_token` y `refresh_token`
      con `HttpOnly` ✓, `Secure` ✓, `SameSite=None`. Confirmar que **no** son
      legibles desde `document.cookie`.
- [ ] **Rutas protegidas**: navegar a `/Pacientes` → los GET responden 200 (cookie enviada).
- [ ] **Sin sesión**: borrar cookies → los endpoints protegidos dan **401** y el front
      redirige a Login.
- [ ] **Refresh automático**: bajar `Jwt:AccessTokenMinutes` (ej. 1) → tras expirar,
      una request dispara `/Refresh` solo y sigue funcionando; verificar la **rotación**
      en la tabla `RefreshTokens` (`RevokedAt` + `ReplacedByToken`).
- [ ] **Logout**: cierra sesión → cookies borradas, refresh revocado en DB, redirect a Login.
- [ ] **(Roles)** Con un doctor `Admin` vs uno `Doctor`, probar un endpoint marcado
      `[Authorize(Roles="Admin")]`: Doctor → 403, Admin → 200.

## 4. Deploy Railway (API) + Vercel (front) — cuando toque

El objetivo del diseño es que sea **solo variables de entorno**, sin cambios de código.

- [ ] **Railway** — setear env vars:
  - [ ] `ConnectionStrings__DbContext`
  - [ ] `Jwt__Key` (la misma o una nueva clave fuerte)
  - [ ] `Jwt__Issuer`, `Jwt__Audience` (o dejar los defaults de `appsettings.json`)
  - [ ] `Cors__AllowedOrigins=https://<tu-app>.vercel.app`
  - [ ] `Cookies__Secure=true`, `Cookies__SameSite=None`
- [ ] **Vercel** — setear `VITE_API_URL=https://<tu-api>.up.railway.app`.
- [ ] Confirmar que ambos lados quedan en **HTTPS** (requisito de `Secure`+`SameSite=None`
      para que la cookie viaje cross-domain).

## 5. Mejoras opcionales / deuda (no bloquean)

- [ ] Restringir por rol los endpoints que correspondan con `[Authorize(Roles="Admin")]`
      (hoy todos los protegidos usan `[Authorize]` = cualquier logueado).
- [ ] Limpieza de refresh tokens expirados/revocados (job o borrado on-login).
- [ ] Endurecer el registro: el `consultoryCode` está hardcodeado a `"1234"` en
      `DoctorController.CreateDoctor` — mover a config si se quiere.
- [ ] Considerar rotación de la `Jwt:Key` y estrategia de invalidación si se filtra.

---

### Referencia rápida de la config

| Clave | Dónde | Notas |
|-------|-------|-------|
| `Jwt:Key` | user-secrets / env | **≥32 bytes**, secreto |
| `Jwt:Issuer` / `Jwt:Audience` | `appsettings.json` | defaults ok |
| `Jwt:AccessTokenMinutes` | `appsettings.json` | default 15 |
| `Jwt:RefreshTokenDays` | `appsettings.json` | default 7 |
| `Cors:AllowedOrigins` | `appsettings.json` / env | CSV; local `http://localhost:3000` |
| `Cookies:Secure` / `Cookies:SameSite` | `appsettings.json` / env | `true` / `None` |
