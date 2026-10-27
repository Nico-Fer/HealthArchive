using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface IRefreshTokenRepository
    {
        RefreshToken? GetByTokenHash(string tokenHash);
        bool Add(RefreshToken token);
        bool Update(RefreshToken token);

        /// <summary>Revoca todas las sesiones activas del doctor (cambio de contraseña).</summary>
        bool RevokeAllForDoctor(Guid doctorId);
        bool Save();
    }
}
