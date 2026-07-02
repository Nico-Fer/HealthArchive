using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface ITokenService
    {
        string CreateAccessToken(Doctor doctor);
        RefreshToken CreateRefreshToken(Guid doctorId);
    }
}
