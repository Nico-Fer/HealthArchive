using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Repositories
{
    public class AppointmentRepository : IAppointmentRepository
    {
        private readonly DBContextHealth _db;

        public AppointmentRepository(DBContextHealth db)
        {
            _db = db;
        }

        public ICollection<Appointment> GetAppointments(Guid consultorioId, DateTime fromUtc, DateTime toUtc, Guid? doctorId)
        {
            var query = _db.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
                .Where(a => a.ConsultorioId == consultorioId && a.StartsAt >= fromUtc && a.StartsAt < toUtc);

            if (doctorId is Guid id) query = query.Where(a => a.DoctorId == id);

            return query.OrderBy(a => a.StartsAt).ToList();
        }

        public Appointment? GetAppointment(Guid id, Guid consultorioId)
        {
            return _db.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
                .FirstOrDefault(a => a.Id == id && a.ConsultorioId == consultorioId);
        }

        public bool HasOverlap(Guid doctorId, DateTime startsAtUtc, int durationMinutes, Guid? excludeAppointmentId)
        {
            var endsAt = startsAtUtc.AddMinutes(durationMinutes);
            // Primero se acota en la base por el inicio (un turno no dura más que
            // Appointment.MaxDurationMinutes) y el solapamiento exacto se calcula en memoria: así no
            // depende de que Npgsql traduzca StartsAt + DurationMinutes.
            var windowStart = startsAtUtc.AddMinutes(-Appointment.MaxDurationMinutes);

            return _db.Appointments
                .Where(a => a.DoctorId == doctorId
                            && a.Status != AppointmentStatus.Cancelado
                            && a.StartsAt >= windowStart
                            && a.StartsAt < endsAt
                            && (excludeAppointmentId == null || a.Id != excludeAppointmentId))
                .Select(a => new { a.StartsAt, a.DurationMinutes })
                .AsEnumerable()
                .Any(a => a.StartsAt.AddMinutes(a.DurationMinutes) > startsAtUtc);
        }

        public bool CreateAppointment(Appointment appointment)
        {
            _db.Appointments.Add(appointment);
            return Save();
        }

        public bool UpdateAppointment(Appointment appointment)
        {
            _db.Appointments.Update(appointment);
            return Save();
        }

        public bool CheckIn(Appointment appointment, Patient? newPatient)
        {
            if (newPatient != null)
            {
                // Mismo alta que PatientRepository.CreatePatient (paciente + su HCE), pero
                // sin su Save(): tiene que ir en el mismo SaveChanges que el turno.
                _db.Patients.Add(newPatient);
                _db.HCEs.Add(new HCE { Patient = newPatient });
                appointment.Patient = newPatient;
                appointment.ClearPersonData();
            }

            appointment.Status = AppointmentStatus.Atendido;
            appointment.CheckedInAt = DateTime.UtcNow;
            return Save();
        }

        public ICollection<Appointment> GetPendingForReminders(DateTime fromUtc, DateTime toUtc)
        {
            return _db.Appointments
                .Include(a => a.Doctor)
                .Include(a => a.Patient)
                .Include(a => a.Consultorio)
                .Where(a => a.Status == AppointmentStatus.Pendiente && a.StartsAt > fromUtc && a.StartsAt <= toUtc)
                .OrderBy(a => a.StartsAt)
                .ToList();
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }
    }
}
