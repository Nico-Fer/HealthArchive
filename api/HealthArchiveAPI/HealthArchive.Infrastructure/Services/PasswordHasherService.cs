using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using Microsoft.AspNetCore.Identity;

namespace HealthArchive.Infrastructure.Services
{
    public class PasswordHasherService : IPasswordHasher
    {
        private readonly PasswordHasher<Doctor> _hasher = new();

        public string Hash(string password)
        {
            return _hasher.HashPassword(null!, password);
        }

        public bool Verify(string hashedPassword, string providedPassword)
        {
            var result = _hasher.VerifyHashedPassword(null!, hashedPassword, providedPassword);
            return result != PasswordVerificationResult.Failed;
        }
    }
}
