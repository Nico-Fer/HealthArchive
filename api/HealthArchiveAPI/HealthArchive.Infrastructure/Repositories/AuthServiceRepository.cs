using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchive.Infrastructure.Data;

namespace HealthArchive.Infrastructure.Repositories
{
    public class AuthServiceRepository : IAuthServiceRepository
    {
        private readonly DBContextHealth _db;
        private readonly IPasswordHasher _passwordHasher;

        public AuthServiceRepository(DBContextHealth db, IPasswordHasher passwordHasher)
        {
            _db = db;
            _passwordHasher = passwordHasher;
        }

        public Doctor Authenticate(string doctorEmail, string password)
        {
            var user = _db.Doctors.FirstOrDefault(u => u.Email == doctorEmail);

            if (user == null || !_passwordHasher.Verify(user.Password, password))
            {
                return null;
            }

            return user;
        }
    }
}
