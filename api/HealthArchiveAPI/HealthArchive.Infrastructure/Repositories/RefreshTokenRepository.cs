using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;

namespace HealthArchive.Infrastructure.Repositories
{
    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly DBContextHealth _db;

        public RefreshTokenRepository(DBContextHealth db)
        {
            _db = db;
        }

        public RefreshToken? GetByToken(string token)
        {
            return _db.RefreshTokens.FirstOrDefault(t => t.Token == token);
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

        public bool Save()
        {
            return _db.SaveChanges() >= 0;
        }
    }
}
