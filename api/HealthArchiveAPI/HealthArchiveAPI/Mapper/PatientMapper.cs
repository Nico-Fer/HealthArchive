using AutoMapper;
using HealthArchiveAPI.DTOs;

namespace HealthArchiveAPI.Mapper
{
    public class PatientMapper : Profile
    {
        public PatientMapper() { 
            CreateMap<PatientMapper, PatientDto>().ReverseMap();
        }
    }
}
