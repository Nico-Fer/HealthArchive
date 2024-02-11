using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.Repository.IRepository
{
    public interface IEvolutionRepository
    {
        Evolution GetEvolution(Guid id);
        bool CreateEvolution(Evolution evolution, Guid hceId);
        bool UpdateEvolution(Evolution evolution);
        bool DeleteEvolution(Evolution evolution);
        bool Save();
    }
}
