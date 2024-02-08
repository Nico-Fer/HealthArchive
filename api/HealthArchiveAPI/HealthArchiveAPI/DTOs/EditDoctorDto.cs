using HealthArchiveAPI.Data;
using System.ComponentModel.DataAnnotations;

namespace HealthArchiveAPI.DTOs
{
    public class EditDoctorDto
    {
        public string Name { get; set; }
        public string LastName { get; set; }
        public Phone PhoneNumber { get; set; }
        public DateTime BirthDate { get; set; }
        public string? Description { get; set; } 
    }
}
