using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;

namespace HealthArchive.Infrastructure.Repositories
{
    public class DoctorRepository : IDoctorRepository
    {
        private readonly DBContextHealth _db;

        public DoctorRepository(DBContextHealth db)
        {
            _db = db;
        }

        public bool CreateDoctor(Doctor doctor)
        {
            _db.Doctors.Add(doctor);
            return Save();
        }

        public bool DeleteDoctor(Doctor doctor)
        {
            _db.Doctors.Remove(doctor);
            return Save();
        }

        public bool DoctorExists(string email)
        {
            return _db.Doctors.Any(d => d.Email == email);
        }

        public Doctor GetDoctor(Guid id, Guid consultorioId)
        {
            return _db.Doctors.FirstOrDefault(d => d.Id == id && d.ConsultorioId == consultorioId);
        }

        public Doctor GetDoctor(string email, Guid consultorioId)
        {
            return _db.Doctors.FirstOrDefault(d => d.Email == email && d.ConsultorioId == consultorioId);
        }

        public Doctor GetDoctorForAuth(Guid id)
        {
            return _db.Doctors.FirstOrDefault(d => d.Id == id);
        }

        public ICollection<Doctor> GetDoctors(Guid consultorioId)
        {
            return _db.Doctors.Where(d => d.ConsultorioId == consultorioId).ToList();
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }

        public bool UpdateDoctor(Doctor doctor)
        {
            _db.Doctors.Update(doctor);
            return Save();
        }
    }
}
