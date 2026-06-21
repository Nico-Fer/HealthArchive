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
