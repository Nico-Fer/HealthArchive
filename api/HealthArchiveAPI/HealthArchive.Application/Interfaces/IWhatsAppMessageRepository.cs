using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IWhatsAppMessageRepository
    {
        /// <summary>El recordatorio al paciente de cada turno, para pintar la agenda.</summary>
        IDictionary<Guid, WhatsAppMessage> GetPatientReminders(IEnumerable<Guid> appointmentIds);
        WhatsAppMessage? GetPatientReminder(Guid appointmentId);
        WhatsAppMessage? GetDoctorAgenda(Guid doctorId, DateOnly localDate);

        /// <summary>
        /// Al reprogramar un turno: borra el registro del recordatorio para que vuelva a
        /// salir con la fecha nueva.
        /// </summary>
        bool DeletePatientReminder(Guid appointmentId);

        bool Upsert(WhatsAppMessage message);
    }
}
