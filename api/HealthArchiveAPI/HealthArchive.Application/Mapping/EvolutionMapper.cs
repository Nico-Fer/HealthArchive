using HealthArchive.Application.DTOs;
using HealthArchive.Domain;

namespace HealthArchive.Application.Mapping
{
    /// <summary>
    /// Mapeo manual entre <see cref="Evolution"/> y <see cref="EvolutionDto"/>.
    /// </summary>
    public static class EvolutionMapper
    {
        /// <summary>
        /// HCEId no se mapea: viene de la ruta, no del body.
        /// </summary>
        public static Evolution ToEntity(this EvolutionDto dto) => new()
        {
            Notes = dto.Notes,
            EvolutionInfo = new EvolutionInfo
            {
                ModifiedBy = dto.ModifiedBy.ModifiedBy,
                Tuition = dto.ModifiedBy.Tuition,
            },
        };
    }
}
