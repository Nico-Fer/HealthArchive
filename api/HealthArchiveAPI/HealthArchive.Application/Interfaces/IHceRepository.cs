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
        bool Save();
    }
}
