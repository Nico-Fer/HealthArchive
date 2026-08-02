using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    /// <summary>
    /// Todas las lecturas piden el consultorio y filtran por él. El filtro vive acá y no
    /// en los controllers a propósito: así un endpoint nuevo no puede olvidarse de aplicarlo.
    /// </summary>
    public interface IPatientRepository
    {
        (ICollection<Patient> Items, int TotalCount) GetPatients(Guid consultorioId, int pageNumber, int pageSize, string? search);
        Patient GetPatient(Guid id, Guid consultorioId);
        Patient GetPatientByDNI(string DNI, Guid consultorioId);
        HCE GetClinicHistory(Guid patientId, Guid consultorioId);
        bool PatientsExists(string DNI, Guid consultorioId);
        bool CreatePatient(Patient patient);
        bool UpdatePatient(Patient patient);
        bool DeletePatient(Patient patient);
        bool Save();
    }
}
