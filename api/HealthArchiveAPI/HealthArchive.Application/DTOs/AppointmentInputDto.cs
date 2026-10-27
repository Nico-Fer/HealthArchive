using HealthArchive.Domain;

namespace HealthArchive.Application.DTOs
{
    /// <summary>
    /// Alta y edición de un turno. O viene <see cref="PatientId"/> (paciente existente) o
    /// viene <see cref="NewPatient"/> con los datos de alguien que todavía no es paciente.
    /// Si los dos vienen, gana el paciente existente.
    /// </summary>
    public class AppointmentInputDto
    {
        public Guid DoctorId { get; set; }
        public Guid? PatientId { get; set; }
        public DateTime StartsAt { get; set; }
        public int DurationMinutes { get; set; } = 30;
        public string? Reason { get; set; }
        public AppointmentPersonDto? NewPatient { get; set; }

        /// <summary>Sobreturno: dar el turno aunque se pise con otro del mismo doctor.</summary>
        public bool AllowOverlap { get; set; }
    }

    /// <summary>
    /// Todo nullable a propósito (con Nullable habilitado, una referencia no-nullable queda
    /// [Required] implícito y el 400 automático no trae el slug): lo obligatorio lo valida
    /// el controller y responde patient_data_incomplete.
    /// </summary>
    public class AppointmentPersonDto
    {
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public string? DNI { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Email { get; set; }
        public Phone? PhoneNumber { get; set; }
        public bool WhatsAppOptIn { get; set; }
    }

    /// <summary>Pendiente, Ausente o Cancelado. Atendido solo entra por CheckIn.</summary>
    public class AppointmentStatusDto
    {
        public string Status { get; set; }
    }

    /// <summary>
    /// Lo que puede faltar para crear el paciente al confirmar la asistencia. Hoy es solo
    /// la fecha de nacimiento: el DNI se exige al dar el turno.
    /// </summary>
    public class CheckInDto
    {
        public DateTime? BirthDate { get; set; }
    }
}
