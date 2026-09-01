namespace HealthArchive.Application.DTOs
{
    /// <summary>
    /// Metadata de un adjunto sin el contenido: es lo que necesitan la descarga y el
    /// borrado, y traer el bytea de las filas pre-backfill solo para mirar la clave
    /// materializaría MBs al pedo.
    /// </summary>
    public class HCEFileMetaDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = "";
        public string? StorageKey { get; set; }
        public string? ContentType { get; set; }
        public long? SizeBytes { get; set; }
    }
}
