using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    public class Patient
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        public string DNI { get; set; }
        [DataType(DataType.Date)]
        public DateTime BirthDate { get; set; }
        public string Country { get; set; }
        public string Email { get; set; }
        public Phone PhoneNumber { get; set; }
        public string Ocupation { get; set; }
        public string HomeAddress { get; set; }
        public string Note { get; set; }
        public MedicalCoverage MedicalCoverage { get; set; }
        public HCE ClinicHistory { get; set; }

        [ForeignKey("Consultorio")]
        public Guid ConsultorioId { get; set; }
        public Consultorio Consultorio { get; set; }
    }
}
