using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    /// <summary>
    /// Un turno de la agenda del consultorio. Puede ser de un paciente que ya existe
    /// (<see cref="PatientId"/>) o de alguien que todavía no es paciente: en ese caso los
    /// datos de la persona viajan en el propio turno y el paciente se crea recién cuando
    /// se confirma la asistencia (CheckIn).
    /// </summary>
    public class Appointment
    {
        /// <summary>Cota de la duración de un turno (8 h). La valida el controller.</summary>
        public const int MaxDurationMinutes = 480;

        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        /// <summary>
        /// A diferencia de HCE y Evolution, el turno lleva el consultorio propio: puede no
        /// tener paciente todavía, así que no hay de dónde heredarlo. El create valida que
        /// el doctor y el paciente sean de este mismo consultorio.
        /// </summary>
        public Guid ConsultorioId { get; set; }
        public Consultorio Consultorio { get; set; } = null!;

        public Guid DoctorId { get; set; }
        public Doctor Doctor { get; set; } = null!;

        public Guid? PatientId { get; set; }
        public Patient? Patient { get; set; }

        // Datos de la persona MIENTRAS no es paciente (PatientId == null). Una vez vinculado,
        // manda el paciente: estos campos no se leen más, para no tener dos fuentes de verdad.
        public string? Name { get; set; }
        public string? LastName { get; set; }
        public string? DNI { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Email { get; set; }
        public Phone? PhoneNumber { get; set; }
        public bool WhatsAppOptIn { get; set; }

        /// <summary>En UTC, como el resto de las fechas del sistema.</summary>
        public DateTime StartsAt { get; set; }
        public int DurationMinutes { get; set; }

        /// <summary>Motivo de la consulta. Nunca viaja en un WhatsApp: es dato de salud.</summary>
        public string? Reason { get; set; }

        public AppointmentStatus Status { get; set; } = AppointmentStatus.Pendiente;
        public DateTime? CheckedInAt { get; set; }

        public Guid? CreatedByDoctorId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Se guarda como texto (HasConversion) para que la base se lea sola.</summary>
    public enum AppointmentStatus
    {
        Pendiente,
        /// <summary>Asistió. Solo se llega por CheckIn, que es lo que crea/vincula el paciente.</summary>
        Atendido,
        Ausente,
        Cancelado,
    }
}
