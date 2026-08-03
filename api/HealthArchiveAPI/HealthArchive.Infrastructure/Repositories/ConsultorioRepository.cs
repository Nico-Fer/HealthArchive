using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;

namespace HealthArchive.Infrastructure.Repositories
{
    public class ConsultorioRepository : IConsultorioRepository
    {
        private readonly DBContextHealth _db;

        public ConsultorioRepository(DBContextHealth db)
        {
            _db = db;
        }

        public ICollection<Consultorio> GetConsultorios()
        {
            return _db.Consultorios.OrderBy(c => c.Name).ToList();
        }

        public ICollection<Consultorio> GetConsultoriosWithCode()
        {
            // Filtrar en SQL: cada consultorio que vuelva cuesta un PBKDF2 en el registro.
            return _db.Consultorios
                .Where(c => c.CodeHash != null && c.CodeHash != "")
                .OrderBy(c => c.Name)
                .ToList();
        }

        public Consultorio GetConsultorio(Guid id)
        {
            return _db.Consultorios.FirstOrDefault(c => c.Id == id);
        }

        public bool NameExists(string name)
        {
            return _db.Consultorios.Any(c => c.Name == name);
        }

        public bool CreateConsultorio(Consultorio consultorio)
        {
            _db.Consultorios.Add(consultorio);
            return Save();
        }

        public bool UpdateConsultorio(Consultorio consultorio)
        {
            _db.Consultorios.Update(consultorio);
            return Save();
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }
    }
}
