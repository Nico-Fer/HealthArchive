using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    /// <summary>
    /// Registro de cada WhatsApp que manda el worker de recordatorios. Sirve para dos cosas:
    /// que un mensaje no salga dos veces (índices únicos por turno y por doctor+día) y que
    /// la agenda pueda mostrar si el recordatorio salió o falló.
    /// No guarda el teléfono ni el texto: solo lo necesario para auditar el envío.
    /// </summary>
    public class WhatsAppMessage
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        public Guid ConsultorioId { get; set; }
        public WhatsAppMessageKind Kind { get; set; }

        /// <summary>Para <see cref="WhatsAppMessageKind.PatientReminder"/>.</summary>
        public Guid? AppointmentId { get; set; }

        /// <summary>Para <see cref="WhatsAppMessageKind.DoctorAgenda"/>, junto con <see cref="LocalDate"/>.</summary>
        public Guid? DoctorId { get; set; }
        public DateOnly? LocalDate { get; set; }

        public WhatsAppMessageStatus Status { get; set; }
        public int Attempts { get; set; }
        public string? ProviderMessageId { get; set; }
        public string? LastError { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public enum WhatsAppMessageKind
    {
        PatientReminder,
        DoctorAgenda,
    }

    public enum WhatsAppMessageStatus
    {
        Sent,
        Failed,
    }
}
