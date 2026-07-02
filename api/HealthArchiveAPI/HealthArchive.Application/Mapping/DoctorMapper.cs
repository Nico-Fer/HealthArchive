using AutoMapper;
using HealthArchive.Domain;
using HealthArchive.Application.DTOs;

namespace HealthArchive.Application.Mapping
{
    public class DoctorMapper : Profile
    {
        public DoctorMapper()
        {
            CreateMap<Doctor, DoctorRegisterDto>().ReverseMap();
            CreateMap<Doctor, DoctorLoginDto>().ReverseMap();
            CreateMap<Doctor, EditDoctorDto>().ReverseMap();
            CreateMap<Doctor, AuthUserDto>();
        }
    }
}
