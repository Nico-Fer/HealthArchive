using AutoMapper;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.DTOs;

namespace HealthArchiveAPI.Mapper
{
    public class DoctorMapper : Profile
    {
        public DoctorMapper(){
            CreateMap<Doctor, DoctorRegisterDto>().ReverseMap();
            CreateMap<Doctor, DoctorLoginDto>().ReverseMap();
            CreateMap<Doctor, EditDoctorDto>().ReverseMap();
        }
    }
}
