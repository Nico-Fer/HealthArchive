using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Repositories
{
    public class HceRepository : IHceRepository
    {
        private readonly DBContextHealth _db;

        public HceRepository(DBContextHealth db)
        {
            _db = db;
        }

        public bool CreateHce(HCE hce)
        {
            _db.HCEs.Add(hce);
            return Save();
        }

        public bool DeleteHce(HCE hce)
        {
            _db.HCEs.Remove(hce);
            return Save();
        }

        public bool AddFile(HCEFile file)
        {
            _db.HCEFiles.Add(file);
            return Save();
        }

        public bool FileBelongsToConsultorio(Guid fileId, Guid consultorioId)
        {
            return _db.HCEFiles.Any(f =>
                f.Id == fileId &&
                f.HCE.Patient.ConsultorioId == consultorioId);
        }

        public bool DeleteFile(Guid fileId)
        {
            // ExecuteDelete y no Remove+Save (que es el patrón del resto del repo): Remove
            // exige materializar la entidad, y HCEFile.Content es un byte[] que puede pesar
            // decenas de MB. Traerlo entero a memoria nada más que para borrarlo no tiene
            // sentido. La pertenencia al consultorio ya la validó FileBelongsToConsultorio.
            return _db.HCEFiles.Where(f => f.Id == fileId).ExecuteDelete() > 0;
        }

        public ICollection<Evolution> GetEvolutions(Guid id)
        {
            var hce = _db.HCEs
                .Include(h => h.Evolutions)
                .FirstOrDefault(h => h.Id == id);
            if (hce == null) return [];

            return hce.Evolutions;
        }

        public HCE GetHce(Guid id)
        {
            return _db.HCEs.FirstOrDefault(h => h.Id == id);
        }

        public bool BelongsToConsultorio(Guid hceId, Guid consultorioId)
        {
            // El consultorio se hereda del paciente: HCE -> Patient -> ConsultorioId.
            // No se duplica la columna en HCE para no tener dos fuentes de verdad.
            return _db.HCEs.Any(h => h.Id == hceId && h.Patient.ConsultorioId == consultorioId);
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }

        public bool UpdateHce(HCE hce)
        {
            _db.HCEs.Update(hce);
            return Save();
        }
    }
}
