using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HealthArchive.Infrastructure.Services
{
    public class TokenService : ITokenService
    {
        private readonly IConfiguration _config;

        public TokenService(IConfiguration config)
        {
            _config = config;
        }

        public string CreateAccessToken(Doctor doctor)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, doctor.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, doctor.Email),
                new Claim(ClaimTypes.Role, doctor.Role),
                // Unidad de aislamiento: los controllers filtran por este claim.
                new Claim("consultorio", doctor.ConsultorioId.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var minutes = int.Parse(_config["Jwt:AccessTokenMinutes"] ?? "15");
            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(minutes),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public (RefreshToken Entity, string Value) CreateRefreshToken(Guid doctorId)
        {
            var value = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
            var entity = new RefreshToken
            {
                TokenHash = HashRefreshToken(value),
                DoctorId = doctorId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = NextRefreshExpiry(),
            };
            return (entity, value);
        }

        // SHA-256 sin salt alcanza: el token son 512 bits aleatorios, no hay diccionario
        // posible. Lo que importa es que leer la tabla no alcance para usarlo. La migración
        // HashRefreshTokens calcula lo mismo en SQL; si cambia el formato, cambiar las dos.
        public string HashRefreshToken(string value)
        {
            return Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
        }

        public DateTime NextRefreshExpiry()
        {
            var minutes = int.Parse(_config["Session:IdleTimeoutMinutes"] ?? "120");
            return DateTime.UtcNow.AddMinutes(minutes);
        }
    }
}
