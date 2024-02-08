using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository.IRepository;

namespace HealthArchiveAPI.Repository
{
    public class EvolutionRepository : IEvolutionRepository
    {
        private readonly DBContextHealth _db;
        public EvolutionRepository(DBContextHealth db)
        {
            _db = db;
        }

        public bool CreateEvolution(Evolution evolution)
        {
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
