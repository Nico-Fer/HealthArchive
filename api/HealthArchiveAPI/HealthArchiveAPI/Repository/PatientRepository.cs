using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository.IRepository;

namespace HealthArchiveAPI.Repository
{
    public class PatientRepository : IPatientRepository
    {
        private readonly DBContextHealth _db;
        public PatientRepository(DBContextHealth db)
        {
            _db = db;
        }

        public bool CreatePatient(Patient patient)
        {
            _db.Patients.Add(patient);
            return Save();
        }

        public bool DeletePatient(Patient patient)
        {
            _db.Patients.Remove(patient);
            return Save();
        }

        public Patient GetPatient(Guid id)
        {
            return _db.Patients.FirstOrDefault(p => p.Id == id);
        }

        public Patient GetPatient(string email)
        {
            return _db.Patients.FirstOrDefault(p => p.Email == email);
        }

        public ICollection<Patient> GetPatients()
        {
            return _db.Patients.ToList();
        }

        public bool PatientsExists(Guid id)
        {
            return _db.Patients.Any(p => p.Id == id);
        }

        public bool PatientsExists(string email, string DNI)
        {
            return _db.Patients.Any(p => p.Email == email && p.DNI == DNI);
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }

        public bool UpdatePatient(Patient patient)
        {
            _db.Patients.Update(patient);
            return Save();
        }
    }
}
