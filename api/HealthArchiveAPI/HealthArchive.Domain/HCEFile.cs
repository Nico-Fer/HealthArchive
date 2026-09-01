using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthArchive.Domain
{
    public class HCEFile
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        public string FileName { get; set; }

        // Transitorio: los adjuntos nuevos viven en el bucket (StorageKey) y esta columna
        // queda solo para las filas que el backfill todavía no subió. Se dropea en la
        // migración B. JsonIgnore como Doctor.Password: GetClinicHistory serializa la
        // entidad tal cual, y sin esto cada adjunto viaja entero en base64 en el JSON.
        [JsonIgnore]
        public byte[]? Content { get; set; }

        // Clave del objeto en el bucket: consultorio/{ConsultorioId}/hce/{HCEId}/{FileId}.
        // Null = el contenido sigue en Content (fila anterior al backfill).
        [JsonIgnore]
        public string? StorageKey { get; set; }

        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }

        // SHA-256 en hex minúscula. Lo usan la verificación del backfill y el rollback.
        [JsonIgnore]
        public string? Sha256 { get; set; }

        [ForeignKey("HCE")]
        public Guid HCEId { get; set; }
        public HCE HCE { get; set; }
    }
}
