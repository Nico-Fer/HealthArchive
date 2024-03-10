using HealthArchiveAPI.Data;

namespace HealthArchiveAPI.Repository.IRepository
{
    public interface IAuthServiceRepository
    {
        Doctor Authenticate(string email, string password);
    }
}
