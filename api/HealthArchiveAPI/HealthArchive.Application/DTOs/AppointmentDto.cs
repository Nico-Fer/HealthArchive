using HealthArchive.Domain;

namespace HealthArchive.Application.DTOs
{
    /// <summary>
    /// Turno tal como lo muestra la agenda. Los datos de la persona ya vienen resueltos:
    /// los del paciente si está vinculado, los del turno si todavía no es paciente.
    /// </summary>
    public class AppointmentDto
    {
        public Guid Id { get; set; }
        public Guid DoctorId { get; set; }
        public string DoctorName { get; set; } = "";
        public Guid? PatientId { get; set; }
        public bool IsNewPatient { get; set; }
        public string Name { get; set; } = "";
        public string LastName { get; set; } = "";
        public string? DNI { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Email { get; set; }
        public Phone? PhoneNumber { get; set; }
        public bool WhatsAppOptIn { get; set; }
        public DateTime StartsAt { get; set; }
        public int DurationMinutes { get; set; }
        public string? Reason { get; set; }
        public string Status { get; set; } = "";
        public DateTime? CheckedInAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public AppointmentReminderDto Reminder { get; set; } = new();
    }

    public class AppointmentReminderDto
    {
        /// <summary>Uno de <see cref="ReminderStates"/>.</summary>
        public string State { get; set; } = ReminderStates.None;
        public DateTime? SentAt { get; set; }
    }

    /// <summary>Estado del recordatorio por WhatsApp al paciente, para el ícono de la agenda.</summary>
    public static class ReminderStates
    {
        public const string Sent = "sent";
        public const string Failed = "failed";
        public const string Scheduled = "scheduled";
        public const string NoPhone = "no_phone";
        public const string InvalidPhone = "invalid_phone";
        public const string NoConsent = "no_consent";
        public const string Disabled = "disabled";
        /// <summary>El turno ya no está pendiente y no se llegó a mandar nada.</summary>
        public const string None = "none";
    }
}
