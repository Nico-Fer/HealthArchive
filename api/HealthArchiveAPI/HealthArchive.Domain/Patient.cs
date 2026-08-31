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
        /// <summary>
        /// Un paciente puede tener varias coberturas. Es una colección owned: no viven
        /// fuera del paciente y se borran con él. La de <c>Order == 0</c> es la principal.
        /// </summary>
        public List<MedicalCoverage> MedicalCoverages { get; set; } = new();
        public HCE ClinicHistory { get; set; }

        [ForeignKey("Consultorio")]
        public Guid ConsultorioId { get; set; }
        public Consultorio Consultorio { get; set; }
    }
}
