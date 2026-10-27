using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Repositories
{
    public class WhatsAppMessageRepository : IWhatsAppMessageRepository
    {
        private readonly DBContextHealth _db;

        public WhatsAppMessageRepository(DBContextHealth db)
        {
            _db = db;
        }

        public IDictionary<Guid, WhatsAppMessage> GetPatientReminders(IEnumerable<Guid> appointmentIds)
        {
            var ids = appointmentIds.ToList();
            if (ids.Count == 0) return new Dictionary<Guid, WhatsAppMessage>();

            return _db.WhatsAppMessages
                .AsNoTracking()
                .Where(m => m.Kind == WhatsAppMessageKind.PatientReminder
                            && m.AppointmentId != null
                            && ids.Contains(m.AppointmentId.Value))
                .ToDictionary(m => m.AppointmentId!.Value);
        }

        public WhatsAppMessage? GetPatientReminder(Guid appointmentId)
        {
            return _db.WhatsAppMessages.FirstOrDefault(m =>
                m.Kind == WhatsAppMessageKind.PatientReminder && m.AppointmentId == appointmentId);
        }

        public WhatsAppMessage? GetDoctorAgenda(Guid doctorId, DateOnly localDate)
        {
            return _db.WhatsAppMessages.FirstOrDefault(m =>
                m.Kind == WhatsAppMessageKind.DoctorAgenda && m.DoctorId == doctorId && m.LocalDate == localDate);
        }

        public bool DeletePatientReminder(Guid appointmentId)
        {
            _db.WhatsAppMessages
                .Where(m => m.Kind == WhatsAppMessageKind.PatientReminder && m.AppointmentId == appointmentId)
                .ExecuteDelete();
            return true;
        }

        public bool Upsert(WhatsAppMessage message)
        {
            message.UpdatedAt = DateTime.UtcNow;
            if (_db.Entry(message).State == EntityState.Detached)
            {
                message.CreatedAt = message.UpdatedAt;
                _db.WhatsAppMessages.Add(message);
            }
            return _db.SaveChanges() >= 0;
        }
    }
}
