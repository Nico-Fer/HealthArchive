using HealthArchive.Domain;

namespace HealthArchive.Application.DTOs
{
    public class EditDoctorDto
    {
        public string Name { get; set; }
        public string LastName { get; set; }
        public Phone? PhoneNumber { get; set; }
        public string? Description { get; set; }
        public string Tuition { get; set; }
    }
}
