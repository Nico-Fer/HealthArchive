using HealthArchive.Application.DTOs;
using HealthArchive.Domain;

namespace HealthArchive.Application.Mapping
{
    /// <summary>
    /// Mapeo manual entre <see cref="Doctor"/> y sus DTOs.
    /// Reemplaza a AutoMapper: es explícito y lo verifica el compilador, así que
    /// una propiedad nueva en el DTO no se pierde en silencio.
    /// </summary>
    public static class DoctorMapper
    {
        public static Doctor ToEntity(this DoctorRegisterDto dto) => new()
        {
            Name = dto.Name,
            LastName = dto.LastName,
            Email = dto.Email,
            Password = dto.Password,
            Tuition = dto.Tuition,
            // Id lo genera la base. Role y Description quedan con el default de la entidad.
            // consultoryCode no se persiste: solo valida el alta en el controller.
        };

        public static AuthUserDto ToAuthUserDto(this Doctor doctor) => new()
        {
            Name = doctor.Name,
            LastName = doctor.LastName,
            Email = doctor.Email,
            Tuition = doctor.Tuition,
            Role = doctor.Role,
        };

        /// <summary>
        /// Vuelca el DTO sobre una entidad ya trackeada por EF (update parcial).
        /// Email, Password, Id y Role no son editables por esta vía.
        /// </summary>
        public static void ApplyTo(this EditDoctorDto dto, Doctor doctor)
        {
            doctor.Name = dto.Name;
            doctor.LastName = dto.LastName;
            doctor.PhoneNumber = dto.PhoneNumber;
            doctor.Description = dto.Description;
            doctor.Tuition = dto.Tuition;
        }
    }
}
