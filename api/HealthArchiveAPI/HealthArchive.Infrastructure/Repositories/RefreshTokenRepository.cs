using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HealthArchive.Infrastructure.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly DBContextHealth _db;

        public RefreshTokenRepository(DBContextHealth db)
        {
            _db = db;
        }

        public RefreshToken? GetByTokenHash(string tokenHash)
        {
            return _db.RefreshTokens.FirstOrDefault(t => t.TokenHash == tokenHash);
        }

        public bool Add(RefreshToken token)
        {
            _db.RefreshTokens.Add(token);
            return Save();
        }

        public bool Update(RefreshToken token)
        {
            _db.RefreshTokens.Update(token);
            return Save();
        }

        // ExecuteUpdate: un solo UPDATE sin traer las filas. Ojo que no pasa por el change
        // tracker, así que una entidad ya cargada en este scope no ve el RevokedAt nuevo.
        public bool RevokeAllForDoctor(Guid doctorId)
        {
            var now = DateTime.UtcNow;
            return _db.RefreshTokens
                .Where(t => t.DoctorId == doctorId && t.RevokedAt == null)
                .ExecuteUpdate(s => s.SetProperty(t => t.RevokedAt, now)) >= 0;
        }

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }
    }
}
