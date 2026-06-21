using AutoMapper;
using HealthArchive.Domain;
using HealthArchive.Application.DTOs;

namespace HealthArchive.Application.Mapping
{
    public class EvolutionMapper : Profile
    {
        public EvolutionMapper()
        {
            CreateMap<Evolution, EvolutionDto>().ReverseMap();
        }
    }
}
