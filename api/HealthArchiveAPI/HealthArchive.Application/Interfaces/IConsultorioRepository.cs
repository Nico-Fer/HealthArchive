using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IConsultorioRepository
    {
        ICollection<Consultorio> GetConsultorios();
        Consultorio GetConsultorio(Guid id);
        bool NameExists(string name);
        bool CreateConsultorio(Consultorio consultorio);
        bool UpdateConsultorio(Consultorio consultorio);
        bool Save();
    }
}
