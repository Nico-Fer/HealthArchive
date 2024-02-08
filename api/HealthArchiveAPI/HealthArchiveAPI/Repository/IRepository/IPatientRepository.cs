using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.Repository.IRepository
{
    public interface IPatientRepository
    {
        ICollection<Patient> GetPatients();
        Patient GetPatient(Guid id);
        Patient GetPatient(string email);
        bool PatientsExists(Guid id);
        bool PatientsExists(string email, string DNI);
        bool CreatePatient(Patient patient);
        bool UpdatePatient(Patient patient);
        bool DeletePatient(Patient patient);
        bool Save();
    }
}
