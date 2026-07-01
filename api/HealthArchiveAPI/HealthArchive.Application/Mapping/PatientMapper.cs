using AutoMapper;
using HealthArchive.Domain;
using HealthArchive.Application.DTOs;

namespace HealthArchive.Application.Mapping
{
    public class PatientMapper : Profile
    {
        public PatientMapper()
        {
            CreateMap<Patient, PatientDto>().ReverseMap();
        }
    }
}
