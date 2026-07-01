using HealthArchive.Domain;

namespace HealthArchive.Application.DTOs
{
    public class EvolutionDto
    {
        public string Notes { get; set; }
        public EvolutionInfo ModifiedBy { get; set; }
    }
}
