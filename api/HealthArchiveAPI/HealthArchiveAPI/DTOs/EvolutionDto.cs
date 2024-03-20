using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.DTOs
{
    public class EvolutionDto
    {
        public string Notes { get; set; }
        public EvolutionInfo ModifiedBy { get; set; }
    }
}
