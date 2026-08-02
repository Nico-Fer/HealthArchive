using HealthArchive.Application.DTOs;
using HealthArchive.Domain;

namespace HealthArchive.Application.Mapping
{
    public static class ConsultorioMapper
    {
        /// <summary>
        /// Proyección pública: solo Id y Name. El CodeHash nunca sale de la capa de datos.
        /// </summary>
        public static ConsultorioDto ToDto(this Consultorio consultorio) => new()
        {
            Id = consultorio.Id,
            Name = consultorio.Name,
        };
    }
}
