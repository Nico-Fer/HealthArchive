using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IEvolutionRepository
    {
        Evolution GetEvolution(Guid id);

        /// <summary>
        /// ¿Esta evolución cuelga de una historia clínica del consultorio dado?
        /// Mismo criterio que <c>IHceRepository.BelongsToConsultorio</c>.
        /// </summary>
        bool BelongsToConsultorio(Guid evolutionId, Guid consultorioId);
        bool CreateEvolution(Evolution evolution, Guid hceId);
        bool UpdateEvolution(Evolution evolution);
        bool DeleteEvolution(Evolution evolution);
        bool Save();
    }
}
