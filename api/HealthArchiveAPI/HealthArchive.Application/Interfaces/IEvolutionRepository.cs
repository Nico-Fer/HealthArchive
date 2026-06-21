using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
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
