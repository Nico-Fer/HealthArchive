using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Repositories
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
            HCE hCE = new HCE
            {
                Patient = patient
            };

            _db.Patients.Add(patient);
            _db.HCEs.Add(hCE);
            return Save();
        }

        public bool DeletePatient(Patient patient)
        {
            var hce = _db.HCEs.FirstOrDefault(h => h.PatientId == patient.Id);

            _db.HCEs.Remove(hce);
            _db.Patients.Remove(patient);
            return Save();
        }

        public HCE GetClinicHistory(Guid patientId, Guid consultorioId)
        {
            var patient = _db.Patients
                .Include(h => h.ClinicHistory)
                    .ThenInclude(ch => ch.Evolutions)
                .Include(h => h.ClinicHistory)
                    .ThenInclude(ch => ch.Files)
                .FirstOrDefault(p => p.Id == patientId && p.ConsultorioId == consultorioId);

            // Null-safe: si el paciente es de otro consultorio (o no existe) devuelve null
            // y el controller responde 404, en vez de reventar con NullReference.
            return patient?.ClinicHistory;
        }

        public Patient GetPatient(Guid id, Guid consultorioId)
        {
            return _db.Patients.FirstOrDefault(p => p.Id == id && p.ConsultorioId == consultorioId);
        }

        public Patient GetPatientByDNI(string DNI, Guid consultorioId)
        {
            return _db.Patients.FirstOrDefault(p => p.DNI == DNI && p.ConsultorioId == consultorioId);
        }

        public (ICollection<Patient> Items, int TotalCount) GetPatients(Guid consultorioId, int pageNumber, int pageSize, string? search)
        {
            var query = _db.Patients.Where(p => p.ConsultorioId == consultorioId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(p =>
                    EF.Functions.ILike(p.Name, $"%{term}%") ||
                    EF.Functions.ILike(p.LastName, $"%{term}%") ||
                    EF.Functions.ILike(p.DNI, $"%{term}%"));
            }

            var totalCount = query.Count();

            var items = query
                .OrderBy(p => p.LastName).ThenBy(p => p.Name)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            return (items, totalCount);
        }

        public bool PatientsExists(string DNI, Guid consultorioId)
        {
            return _db.Patients.Any(p => p.DNI == DNI && p.ConsultorioId == consultorioId);
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
