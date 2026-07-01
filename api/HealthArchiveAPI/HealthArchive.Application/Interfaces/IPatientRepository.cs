using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IPatientRepository
    {
        ICollection<Patient> GetPatients();
        (ICollection<Patient> Items, int TotalCount) GetPatients(int pageNumber, int pageSize, string? search);
        Patient GetPatient(Guid id);
        Patient GetPatient(string email);
        Patient GetPatientByDNI(string DNI);
        HCE GetClinicHistory(Guid id);
        bool PatientsExists(Guid id);
        bool PatientsExists(string DNI);
        bool CreatePatient(Patient patient);
        bool UpdatePatient(Patient patient);
        bool DeletePatient(Patient patient);
        bool Save();
    }
}
