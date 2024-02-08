using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.Repository.IRepository
{
    public interface IDoctorRepository
    {
        ICollection<Doctor> GetDoctors();

        Doctor GetDoctor(Guid id);
        bool DoctorExists(Guid id);
        bool DoctorExists(string email);
        bool CreateDoctor(Doctor doctor);
        bool UpdateDoctor(Doctor doctor);
        bool DeleteDoctor(Doctor doctor);
        bool Save();
    }
}
