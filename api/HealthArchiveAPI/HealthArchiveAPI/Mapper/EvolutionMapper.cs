using AutoMapper;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.DTOs;

namespace HealthArchiveAPI.Mapper
{
    public class EvolutionMapper : Profile
    {
        public EvolutionMapper() {
            CreateMap<Evolution, EvolutionDto>().ReverseMap();
        }
    }
}
