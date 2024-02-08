using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.DTOs
{
    public class DoctorRegisterDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        public Phone PhoneNumber { get; set; }
    }
}
