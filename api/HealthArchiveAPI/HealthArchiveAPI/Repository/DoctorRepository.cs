using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository.IRepository;

namespace HealthArchiveAPI.Repository
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

        public bool DoctorExists(Guid id)
        {
            return _db.Doctors.Any(d => d.Id == id);
        }

        public bool DoctorExists(string email)
        {
            return _db.Doctors.Any(d => d.Email == email);
        }

        public Doctor GetDoctor(Guid id)
        {
            return _db.Doctors.FirstOrDefault(d => d.Id == id);
        }

        public ICollection<Doctor> GetDoctors()
        {
            return _db.Doctors.ToList();
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
