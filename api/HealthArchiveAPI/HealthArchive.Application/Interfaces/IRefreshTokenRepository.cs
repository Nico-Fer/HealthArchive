using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IRefreshTokenRepository
    {
        RefreshToken? GetByToken(string token);
        bool Add(RefreshToken token);
        bool Update(RefreshToken token);
        bool Save();
    }
}
