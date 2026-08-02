using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;

namespace HealthArchive.Infrastructure.Repositories
{
    public class EvolutionRepository : IEvolutionRepository
    {
        private readonly DBContextHealth _db;

        public EvolutionRepository(DBContextHealth db)
        {
            _db = db;
        }

        public bool CreateEvolution(Evolution evolution, Guid hceId)
        {
            var hce = _db.HCEs.FirstOrDefault(h => h.Id == hceId);
            if (hce == null) return false;

            evolution.HCEId = hceId;
            evolution.ClinicHistory = hce;
            evolution.ModifiedDate = DateTime.UtcNow;

            _db.Evolutions.Add(evolution);
            return Save();
        }

        public bool DeleteEvolution(Evolution evolution)
        {
            _db.Evolutions.Remove(evolution);
            return Save();
        }

        public Evolution GetEvolution(Guid id)
        {
            return _db.Evolutions.FirstOrDefault(e => e.Id == id);
        }

        public bool BelongsToConsultorio(Guid evolutionId, Guid consultorioId)
        {
            return _db.Evolutions.Any(e =>
                e.Id == evolutionId &&
                e.ClinicHistory.Patient.ConsultorioId == consultorioId);
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }

        public bool UpdateEvolution(Evolution evolution)
        {
            _db.Evolutions.Update(evolution);
            return Save();
        }
    }
}
