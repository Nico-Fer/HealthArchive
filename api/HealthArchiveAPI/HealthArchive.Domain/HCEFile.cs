using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    public class HCEFile
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        public string FileName { get; set; }
        public byte[] Content { get; set; }

        [ForeignKey("HCE")]
        public Guid HCEId { get; set; }
        public HCE HCE { get; set; }
    }
}
