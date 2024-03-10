using HealthArchiveAPI.Data;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace HealthArchiveAPI.DTOs
{
    public class PatientDto
    {
        public string Name { get; set; }
        public string LastName { get; set; }
        public string DNI { get; set; }
        public DateTime? BirthDate { get; set; }
        public string? Country { get; set; }
        public string? Email { get; set; } = "";
        public Phone? PhoneNumber { get; set; }
        public string? Ocupation { get; set; } = "";
        public string? HomeAddress { get; set; }
        public string? Note { get; set; } = "";
        public MedicalCoverage? MedicalCoverage { get; set; }
    }
}
