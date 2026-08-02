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
        /// Solo mapea el texto. HCEId viene de la ruta, y EvolutionInfo lo arma el
        /// controller con el doctor autenticado: si se tomara del DTO, cualquiera podría
        /// firmar una evolución con el nombre y la matrícula de otro profesional.
        /// </summary>
        public static Evolution ToEntity(this EvolutionDto dto) => new()
        {
            Notes = dto.Notes,
        };
    }
}
