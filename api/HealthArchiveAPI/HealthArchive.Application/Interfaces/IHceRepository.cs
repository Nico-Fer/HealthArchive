using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IHceRepository
    {
        HCE GetHce(Guid id);
        ICollection<Evolution> GetEvolutions(Guid id);

        /// <summary>
        /// ¿Esta historia clínica pertenece a un paciente del consultorio dado?
        /// Hay que llamarlo en TODO endpoint que reciba un hceId por ruta o query: sin
        /// esto, un doctor puede leer o modificar la historia de otro consultorio con
        /// solo conocer el GUID, y el aislamiento de los listados queda decorativo.
        /// </summary>
        bool BelongsToConsultorio(Guid hceId, Guid consultorioId);
        bool CreateHce(HCE hce);
        bool UpdateHce(HCE hce);
        bool DeleteHce(HCE hce);
        bool AddFile(HCEFile file);

        /// <summary>
        /// ¿Este adjunto cuelga de una historia clínica del consultorio dado?
        /// Mismo criterio que <see cref="BelongsToConsultorio"/> un nivel más abajo:
        /// HCEFile -> HCE -> Patient -> ConsultorioId.
        /// </summary>
        bool FileBelongsToConsultorio(Guid fileId, Guid consultorioId);

        /// <summary>
        /// Borra un adjunto por id. Devuelve false si no existe.
        /// </summary>
        bool DeleteFile(Guid fileId);
        bool Save();
    }
}
