namespace HealthArchive.Application.Interfaces
{
    /// <summary>
    /// Contenido de los adjuntos clínicos en object storage. La clave la decide el
    /// llamador y se persiste en HCEFile.StorageKey; la autorización nunca sale de la
    /// clave, siempre de la base (FileBelongsToConsultorio).
    /// </summary>
    public interface IFileStorage
    {
        Task PutAsync(string key, Stream content, string contentType, long length);
        Task<Stream> GetAsync(string key);
        Task DeleteAsync(string key);
    }
}
