using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IDoctorRepository
    {
        ICollection<Doctor> GetDoctors(Guid consultorioId);
        Doctor GetDoctor(Guid id, Guid consultorioId);
        Doctor GetDoctor(string email, Guid consultorioId);

        /// <summary>
        /// Sin filtrar por consultorio: lo usa la autenticación (Refresh y Me), donde
        /// todavía no hay un consultorio de contexto — justamente se está resolviendo
        /// quién es el usuario. <b>No usar desde endpoints de negocio</b>: para eso está
        /// la sobrecarga que recibe el consultorio.
        /// </summary>
        Doctor GetDoctorForAuth(Guid id);

        /// <summary>
        /// El email es la credencial de login, así que es único a nivel sistema y no
        /// por consultorio: dos doctores de consultorios distintos no pueden compartirlo.
        /// </summary>
        bool DoctorExists(string email);

        bool CreateDoctor(Doctor doctor);
        bool UpdateDoctor(Doctor doctor);
        bool DeleteDoctor(Doctor doctor);
        bool Save();
    }
}
