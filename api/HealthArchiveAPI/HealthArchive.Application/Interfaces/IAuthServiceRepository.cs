using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IAuthServiceRepository
    {
        Doctor Authenticate(string email, string password);
    }
}
