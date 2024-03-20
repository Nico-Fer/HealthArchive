using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace HealthArchiveAPI.Data
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
