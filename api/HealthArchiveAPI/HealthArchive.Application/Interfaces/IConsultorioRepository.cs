using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IConsultorioRepository
    {
        ICollection<Consultorio> GetConsultorios();

        /// <summary>
        /// Consultorios que tienen código de alta configurado. Lo usa el registro, que
        /// tiene que verificar el código contra todos: el hash lleva salt, así que no se
        /// puede buscar un consultorio "por su código" con una query.
        /// </summary>
        ICollection<Consultorio> GetConsultoriosWithCode();

        Consultorio GetConsultorio(Guid id);
        bool NameExists(string name);
        bool CreateConsultorio(Consultorio consultorio);
        bool UpdateConsultorio(Consultorio consultorio);
        bool Save();
    }
}
