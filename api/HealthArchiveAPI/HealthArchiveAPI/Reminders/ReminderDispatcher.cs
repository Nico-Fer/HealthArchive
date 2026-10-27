using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Messaging;
using HealthArchive.Domain;
using Microsoft.EntityFrameworkCore;

namespace HealthArchiveAPI.Reminders
{
    /// <summary>
    /// Una pasada del worker: manda los WhatsApp que correspondan en este momento.
    ///  - Al paciente, un recordatorio por turno dentro de las próximas
    ///    Reminders:PatientHoursBefore horas (24), si tiene celular válido y dio el opt-in.
    ///  - Al doctor, una vez por día desde Reminders:DoctorAgendaTime (07:30), la agenda que
    ///    le queda hoy, si tiene celular y WhatsAppAgendaOptIn.
    /// Idempotente: cada envío queda en WhatsAppMessages y no se repite. Si la API estuvo
    /// abajo, la primera pasada al volver manda lo que siga en ventana.
    /// El motivo del turno no se manda nunca: es dato de salud y WhatsApp es un tercero.
    /// </summary>
    public class ReminderDispatcher
    {
        public const int MaxAttempts = 3;

        private readonly IAppointmentRepository _appointments;
        private readonly IWhatsAppMessageRepository _messages;
        private readonly IWhatsAppSender _sender;
        private readonly IConfiguration _config;
        private readonly ILogger<ReminderDispatcher> _logger;

        public ReminderDispatcher(
            IAppointmentRepository appointments,
            IWhatsAppMessageRepository messages,
            IWhatsAppSender sender,
            IConfiguration config,
            ILogger<ReminderDispatcher> logger)
        {
            _appointments = appointments;
            _messages = messages;
            _sender = sender;
            _config = config;
            _logger = logger;
        }

        public async Task RunAsync(DateTime nowUtc, CancellationToken cancellationToken)
        {
            if (!_sender.IsEnabled) return;

            var tz = ReminderClock.TimeZone(_config);
            var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, tz);

            // De noche no sale nada; lo pendiente se manda al terminar el silencio.
            var quietStart = ReminderClock.TimeOfDay(_config, "Reminders:QuietHoursStart", "21:00");
            var quietEnd = ReminderClock.TimeOfDay(_config, "Reminders:QuietHoursEnd", "08:00");
            if (ReminderClock.IsQuiet(nowLocal.TimeOfDay, quietStart, quietEnd)) return;

            var hoursBefore = _config.GetValue("Reminders:PatientHoursBefore", 24);
            // Una sola consulta para las dos cosas: la ventana del paciente (24 h) siempre
            // cubre lo que le queda del día al doctor.
            var pending = _appointments.GetPendingForReminders(nowUtc, nowUtc.AddHours(Math.Max(hoursBefore, 24)));

            foreach (var appointment in pending.Where(a => a.StartsAt <= nowUtc.AddHours(hoursBefore)))
            {
                if (cancellationToken.IsCancellationRequested) return;
                await SendPatientReminderAsync(appointment, tz, cancellationToken);
            }

            var agendaTime = ReminderClock.TimeOfDay(_config, "Reminders:DoctorAgendaTime", "07:30");
            if (nowLocal.TimeOfDay < agendaTime) return;

            var today = DateOnly.FromDateTime(nowLocal);
            var endOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(nowLocal.Date.AddDays(1), tz);
            var byDoctor = pending
                .Where(a => a.StartsAt < endOfDayUtc)
                .GroupBy(a => a.DoctorId);

            foreach (var agenda in byDoctor)
            {
                if (cancellationToken.IsCancellationRequested) return;
                await SendDoctorAgendaAsync(agenda.ToList(), today, tz, cancellationToken);
            }
        }

        private async Task SendPatientReminderAsync(Appointment appointment, TimeZoneInfo tz, CancellationToken ct)
        {
            var patient = appointment.Patient;
            var optIn = patient?.WhatsAppOptIn ?? appointment.WhatsAppOptIn;
            var to = WhatsAppPhone.Normalize(patient != null ? patient.PhoneNumber : appointment.PhoneNumber);
            if (!optIn || to == null) return;

            var log = _messages.GetPatientReminder(appointment.Id);
            if (!ShouldSend(log)) return;

            var startsAtLocal = TimeZoneInfo.ConvertTimeFromUtc(appointment.StartsAt, tz);
            var firstName = FirstWord(patient?.Name ?? appointment.Name);

            var result = await _sender.SendTemplateAsync(
                to,
                _config["WhatsApp:PatientReminderTemplate"] ?? "recordatorio_turno",
                new[]
                {
                    firstName,
                    $"{appointment.Doctor.Name} {appointment.Doctor.LastName}",
                    startsAtLocal.ToString("dddd d/M", ReminderClock.Culture),
                    startsAtLocal.ToString("HH:mm", ReminderClock.Culture),
                    appointment.Consultorio.Name,
                },
                ct);

            Record(log ?? new WhatsAppMessage
            {
                ConsultorioId = appointment.ConsultorioId,
                Kind = WhatsAppMessageKind.PatientReminder,
                AppointmentId = appointment.Id,
            }, result, to, "recordatorio del turno " + appointment.Id);
        }

        private async Task SendDoctorAgendaAsync(List<Appointment> appointments, DateOnly today, TimeZoneInfo tz, CancellationToken ct)
        {
            var doctor = appointments[0].Doctor;
            if (!doctor.WhatsAppAgendaOptIn) return;

            var to = WhatsAppPhone.Normalize(doctor.PhoneNumber);
            if (to == null) return;

            var log = _messages.GetDoctorAgenda(doctor.Id, today);
            if (!ShouldSend(log)) return;

            var first = TimeZoneInfo.ConvertTimeFromUtc(appointments.Min(a => a.StartsAt), tz);

            var result = await _sender.SendTemplateAsync(
                to,
                _config["WhatsApp:DoctorAgendaTemplate"] ?? "agenda_diaria",
                new[]
                {
                    FirstWord(doctor.Name),
                    appointments.Count.ToString(ReminderClock.Culture),
                    first.ToString("HH:mm", ReminderClock.Culture),
                },
                ct);

            Record(log ?? new WhatsAppMessage
            {
                ConsultorioId = doctor.ConsultorioId,
                Kind = WhatsAppMessageKind.DoctorAgenda,
                DoctorId = doctor.Id,
                LocalDate = today,
            }, result, to, "agenda del doctor " + doctor.Id);
        }

        /// <summary>Nunca se repite uno enviado; uno fallido, hasta MaxAttempts.</summary>
        private static bool ShouldSend(WhatsAppMessage? log) =>
            log == null || (log.Status == WhatsAppMessageStatus.Failed && log.Attempts < MaxAttempts);

        private void Record(WhatsAppMessage log, WhatsAppSendResult result, string to, string what)
        {
            log.Attempts++;
            if (result.Success)
            {
                log.Status = WhatsAppMessageStatus.Sent;
                log.ProviderMessageId = result.MessageId;
                log.LastError = null;
                _logger.LogInformation("WhatsApp enviado: {What} a {To}", what, WhatsAppPhone.Mask(to));
            }
            else
            {
                log.Status = WhatsAppMessageStatus.Failed;
                log.LastError = result.Error;
                // Un error permanente (número inválido, plantilla rechazada) no se reintenta.
                if (!result.Transient) log.Attempts = MaxAttempts;
                _logger.LogWarning(
                    "WhatsApp fallido: {What} a {To} (intento {Attempt}, {Kind}): {Error}",
                    what, WhatsAppPhone.Mask(to), log.Attempts, result.Transient ? "transitorio" : "permanente", result.Error);
            }

            try
            {
                _messages.Upsert(log);
            }
            catch (DbUpdateException ex)
            {
                // Solo pasaría con dos instancias corriendo a la vez: el índice único frena
                // el duplicado y el mensaje ya salió por la otra.
                _logger.LogWarning(ex, "No se pudo registrar el WhatsApp ({What})", what);
            }
        }

        private static string FirstWord(string? value) =>
            (value ?? "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "";
    }
}
