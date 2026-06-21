using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    public class HCE
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        [ForeignKey("Patient")]
        public Guid PatientId { get; set; }
        public Patient Patient { get; set; }
        public ICollection<Evolution> Evolutions { get; set; } = new List<Evolution>();
        public ICollection<HCEFile> Files { get; set; } = new List<HCEFile>();
    }
}
