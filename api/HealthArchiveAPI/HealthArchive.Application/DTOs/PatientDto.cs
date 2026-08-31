using HealthArchive.Domain;

namespace HealthArchive.Application.DTOs
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
        /// <summary>
        /// Coberturas del paciente, en orden: la primera es la principal. El Order que
        /// traiga el cliente se ignora — lo reasigna el mapper por posición.
        /// </summary>
        public List<MedicalCoverage>? MedicalCoverages { get; set; }
    }
}
