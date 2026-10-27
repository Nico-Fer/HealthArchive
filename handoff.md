# Handoff — Turnera con recordatorios (branch `claude/turnera`)

> Archivo de trabajo para retomar en otra sesión. **Borrarlo antes de mergear.**
> El handoff anterior (incidente de Railway) se reemplazó: sus pasos manuales pendientes
> siguen documentados en `docs/deploy.md` §7.

## Qué se pidió

Pestaña **Turnos** para dar turnos a pacientes (o a personas que todavía no lo son),
recordatorios por **WhatsApp** al paciente y al médico, **campanita** en la app con el resumen
del día para el médico, y **"Confirmar asistencia"**, que abre la HCE (y crea el paciente si no
existe).

Decisiones tomadas con el usuario (no volver a preguntar):
- Alguien nuevo: se piden **nombre, apellido y DNI** al dar el turno. Si al confirmar falta
  la fecha de nacimiento, un mini-formulario pide solo eso y sigue a la HCE.
- Médico: **resumen diario** por WhatsApp (07:30) + campanita en la app con el resumen del día +
  aviso 10 min antes de cada turno.
- Paciente: WhatsApp 24 h antes, **solo aviso** (sin botones ni webhook por ahora).
- **Opt-in explícito** (checkbox, desmarcado por defecto) para pacientes y médicos.
- Meta Cloud API **directa** (sin BSP). Costo estimado ≈ USD 0,03 por recordatorio (Utility, AR).

## Estado por etapa

| # | Etapa | Estado |
|---|---|---|
| 1 | Backend: `Appointment`, `WhatsAppMessage`, opt-ins, migración `Appointments`, `AppointmentController`, sender de WhatsApp, `ReminderWorker` | ✅ probado con curl + mock de WhatsApp |
| 2 | Front: pestaña Turnos + confirmar asistencia → HCE (+ opt-in de WhatsApp en los formularios de paciente) | ✅ `tsc` + E2E en Chromium |
| 3 | Front: campanita (resumen del día) + avisos 10 min antes | ✅ E2E: toast, badge, resumen, sin duplicar entre pestañas, 0 llamadas a /Refresh |
| 4 | Front: opt-in en el perfil del médico (`FormProfesional`, solo en el perfil propio) | ✅ E2E |
| 5 | Docs: `CLAUDE.md` + `docs/deploy.md` §8 (setup de Meta, plantillas, costos) | ✅ |

**Código terminado.** Falta lo que no se puede hacer desde acá:
1. **Meta:** verificación del negocio, número, medio de pago, las 2 plantillas Utility en
   `es_AR` y el token permanente. Paso a paso en `docs/deploy.md` §8.
2. **Railway:** deployar con `RunMigrationsOnStartup=true` (migración `Appointments`) y,
   cuando Meta esté listo, `WhatsApp__Enabled`, `WhatsApp__PhoneNumberId` y
   `WhatsApp__AccessToken`.
3. **Probar contra Meta real** con el número de prueba. Acá solo se probó contra un mock.
   Tampoco se probó en Safari/Firefox ni contra Railway/Vercel.
4. **Borrar este `handoff.md` antes de mergear.**

Ideas para una segunda etapa (no pedidas):
- botones Confirmo/Cancelo en el WhatsApp, que necesitan un webhook con verificación de la
  firma de Meta;
- vista semanal;
- aviso al paciente cuando se cancela o reprograma su turno.

El diseño del front tal como se planificó está más abajo, en **Plan del front**.

## Backend — lo que hay

- `HealthArchive.Domain/Appointment.cs`: lleva `ConsultorioId` propio (puede no tener
  paciente). Los datos de la persona (`Name`, `DNI`, `PhoneNumber`, `WhatsAppOptIn`…) se usan
  solo mientras `PatientId == null` y se limpian al vincular (`AppointmentMapper.ClearPersonData`).
  `Status`: `Pendiente | Atendido | Ausente | Cancelado`, guardado como texto.
- `WhatsAppMessage`: log/outbox de envíos, con índices únicos filtrados para la idempotencia
  (`Kind+AppointmentId`, `Kind+DoctorId+LocalDate`).
- `Patient.WhatsAppOptIn`, `Doctor.WhatsAppAgendaOptIn` (default false), ya mapeados en
  `PatientDto`/`EditDoctorDto`.
- `AppointmentController` (`api/Appointment/...`):
  - `GET GetAppointments?from&to&doctorId`: from/to en UTC, máximo 31 días. Devuelve
    `AppointmentDto` con la persona resuelta, `isNewPatient`, `doctorName` y
    `reminder.state` (`sent|failed|scheduled|no_phone|invalid_phone|no_consent|disabled|none`).
  - `POST CreateAppointment` (`AppointmentInputDto`: `DoctorId`, `PatientId?`, `StartsAt`,
    `DurationMinutes`, `Reason?`, `NewPatient?`, `AllowOverlap`). Slugs:
    `patient_data_incomplete`, `doctor_not_found`, `patient_not_found`, `invalid_duration`
    y 409 `appointment_overlap` (se reenvía con `AllowOverlap:true` = sobreturno).
    Si el DNI del nuevo ya es de un paciente, **lo vincula**.
  - `PATCH UpdateAppointment/{id}`: solo si está Pendiente (`appointment_not_pending`). Si
    cambia la fecha o la persona, borra el log del recordatorio para que se reenvíe.
  - `PATCH UpdateAppointmentStatus/{id}` `{Status}`: Pendiente, Ausente o Cancelado
    (`invalid_status`).
  - `POST CheckIn/{id}` `{BirthDate?}`: devuelve el **Patient**. Slugs
    `birthdate_required`, `appointment_cancelled`. Es atómico (paciente + HCE + turno en un
    SaveChanges) e idempotente.
- `Reminders/ReminderWorker` (cada `Reminders:PollMinutes`) → `ReminderDispatcher`. Con
  `WhatsApp:Enabled=false` no hace nada.
- `Services/WhatsAppCloudApiSender`: `HttpClient` pelado, sin paquetes nuevos.
- Config nueva en `appsettings.json`: secciones `WhatsApp` y `Reminders`.
- `Program.cs`: valida la zona horaria al arrancar, y en Production hace fail-fast si
  `WhatsApp:Enabled` está prendido sin token o sin PhoneNumberId.

## Cómo probar el backend en este container

`global.json` pide el SDK 10.0.301 y el container tiene 10.0.113, así que se compila en una
copia fuera del repo. Los scripts estaban en el scratchpad de la sesión: si no existen,
recrearlos.
1. Copiar `api/HealthArchiveAPI` a una carpeta fuera del repo y correr `dotnet build`.
2. `dotnet tool install --global dotnet-ef --version 10.0.0`. El manifest pinea 8.0.3, que
   no corre sin runtime 8.
3. `pg_ctlcluster 16 main start`, crear la base y correr `dotnet ef database update` con
   `ConnectionStrings__DbContext`.
4. Levantar la API con `ASPNETCORE_ENVIRONMENT=Development`, `Jwt__Key`, `Cookies__Secure=false`,
   `WhatsApp__Enabled=true`, `WhatsApp__BaseUrl=http://127.0.0.1:9099` (mock en Python que
   loguea los POST y responde OK/500/400) y `Reminders__PollMinutes=1`.

Verificado:
- Endpoints con curl: 409 y sobreturno, vinculación por DNI, `birthdate_required` → CheckIn
  crea paciente + HCE, CheckIn idempotente, 404, `invalid_range`, `invalid_status`.
- Worker, reintentos: con error 500 hace 3 intentos y para. Al reprogramar el turno, el recordatorio se reenvía.
- Front (etapa 2): E2E con Playwright. Turno para alguien nuevo → Confirmar asistencia →
  diálogo de fecha de nacimiento → HCE del paciente creado → volver muestra "Atendido".
  Front con `VITE_API_URL=http://localhost:5080`.
- Campanita (`pages/App/NavBar/NotificationBell.tsx` + `lib/agendaNotices.ts`): todo en un
  componente del NavBar, **sin slice de Redux** (el NavBar solo se monta con sesión, así que
  los timers mueren con el logout). El estado compartido entre pestañas vive en localStorage
  (`ha-agenda`, que se reinicia al cambiar el día).
- Worker: un WhatsApp por turno (idempotente entre ticks), normalización
  `011 15 5000 1111` → `5491150001111`, agenda diaria del doctor con el conteo de hoy (hora
  local AR) y teléfonos enmascarados en el log.

## Plan del front (`web-app/src/`)

- **Ruta y navegación:** `/Turnos` bajo `<AuthGuard>` en `pages/App/App.tsx`, y link "Turnos" en `NavBar.tsx`.
- **`pages/Turnos/`** (`Turnos.tsx`, `Turnos.scss`, `index.ts`):
  - Agenda del día con ‹ Hoy ›, el `DateField` existente y un filtro por doctor (default: yo, con opción "Todos").
  - En cada fila: hora, persona (chip "Nuevo" si no es paciente), estado, ícono de WhatsApp con tooltip según `reminder.state`, y las acciones **Confirmar asistencia**, Ausente, Cancelar (con `ConfirmDialog`) y Editar.
  - `AppointmentForm.tsx`: modal con el patrón `.ha-modal` de `FormPaciente`.
    - Campos: doctor, fecha, hora, duración y motivo.
    - Paciente: buscador que reusa `GET api/Patient/GetPatients?search=`, o "Paciente nuevo" con nombre/apellido/DNI y opcionales. Si el DNI ya existe al salir del campo, ofrece usar ese paciente.
    - Celular con la ayuda "sin 0 ni 15" y checkbox de opt-in.
    - Ante un 409 `appointment_overlap` pregunta si se da un sobreturno.
  - `CheckInDialog.tsx`: ante `birthdate_required`, pide solo la fecha con `DateField` y reintenta.
  - Al confirmar: `POST CheckIn` → `mapPatientFromApi` → `navigate('/Pacientes/HistoriaClinica', { state: { patient } })`, igual que `PatientTable.tsx`.
- **`Functions/mapPatientFromApi.ts`:** extraer el mapeo que hoy está inline en `pages/Pacients/Patients.tsx` y reusarlo en las dos pantallas (suma `WhatsAppOptIn`).
- **Fechas:** se arma la fecha local con el día del `DateField` + "HH:mm" y se manda con `.toISOString()`. Lo que vuelve se lee con `parseApiTimestamp`, nunca con `new Date` pelado. El rango del día va de medianoche local a medianoche local.
- **Campanita** (`pages/App/NavBar/NotificationBell.tsx`), en el navbar junto al nombre:
  - Dropdown con el **resumen del día**: cuántos turnos tengo hoy, cuántos pendientes, atendidos y ausentes, el próximo, la lista de pendientes con hora y un link a Turnos.
  - Debajo, los avisos "En 10 min: …" que se generaron hoy.
  - Badge con los no vistos: el resumen del día cuenta como no visto hasta abrir la campanita ese día, más los avisos nuevos. Lo visto se guarda en localStorage por día.
  - Todo se calcula en el cliente con `GetAppointments` de hoy para el doctor logueado, **sin tabla nueva**. El estado lo comparte con el watcher a través de un slice chico de Redux, `Agenda`, que no se persiste.
- **Aviso en la app** (`pages/App/AppointmentReminders.tsx`, montado como `IdleWatcher`):
  - Con la sesión abierta, trae los turnos de hoy del doctor logueado y programa un toast 10 min antes de cada turno pendiente, con un link a Turnos.
  - Si el usuario dio permiso con el botón "Activar avisos del navegador" de la pestaña, usa también la `Notification` del navegador.
  - Recarga al montar, cuando Turnos dispara `ha-appointments-changed` y cada 10 min con la pestaña visible.
  - Para no avisar dos veces entre pestañas guarda los ids ya avisados en localStorage.
- **`api/client.ts`:**
  - Nueva opción `ApiFetchOptions.refreshOnUnauthorized` (default `true`), y `apiGet` acepta `options`.
  - Los polls usan `false` porque un `/Refresh` corre la ventana de inactividad del server: un poll de fondo mantendría la sesión viva para siempre y rompería el cierre a las 2 h.
- **`components/Toast/`** (nuevo, mínimo).
- **Opt-in en formularios:**
  - Paciente: checkbox en `NewPatient.tsx` y `FormPaciente.tsx`, deshabilitado sin celular. Se agrega `WhatsAppOptIn` al tipo `Patient` en `Types/Person.ts`.
  - Médico: checkbox "Recibir la agenda del día por WhatsApp" en `Profesional/Componentes/FormProfesional.tsx`.
- `Types/Appointment.ts` (nuevo).

## Plan de la documentación
- **`CLAUDE.md`:** sección "Turnos y recordatorios" con:
  - por qué `Appointment` lleva `ConsultorioId` propio;
  - los datos de la persona solo mientras no hay `PatientId`, y la vinculación por DNI;
  - CheckIn atómico;
  - opt-in;
  - nunca el motivo en un WhatsApp;
  - worker e idempotencia;
  - catch-up tras `railway down`;
  - la regla de `refreshOnUnauthorized:false` para los requests de fondo;
  - las zonas horarias.
- **`docs/deploy.md` §8 "WhatsApp":**
  - pasos en Meta: verificación del negocio, app con el producto WhatsApp, número dedicado, las 2 plantillas Utility en `es_AR` (texto sugerido, sin contenido promocional), System User con token **permanente** (el temporal del panel vence en 24 h) y medio de pago;
  - env vars y número de prueba;
  - costos.
