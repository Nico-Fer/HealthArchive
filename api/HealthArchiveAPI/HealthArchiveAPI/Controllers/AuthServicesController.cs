using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace HealthArchiveAPI.Controllers
{
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthServiceController : ControllerBase
    {
        private readonly IAuthServiceRepository _authServiceRepo;
        private readonly IDoctorRepository _doctorRepo;
        private readonly ITokenService _tokenService;
        private readonly IRefreshTokenRepository _refreshTokenRepo;
        private readonly IConfiguration _config;

        public AuthServiceController(
            IAuthServiceRepository authServiceRepo,
            IDoctorRepository doctorRepo,
            ITokenService tokenService,
            IRefreshTokenRepository refreshTokenRepo,
            IConfiguration config)
        {
            _authServiceRepo = authServiceRepo;
            _doctorRepo = doctorRepo;
            _tokenService = tokenService;
            _refreshTokenRepo = refreshTokenRepo;
            _config = config;
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [Route("Login")]
        public IActionResult Login([FromBody] DoctorLoginDto doctorDto)
        {
            Doctor user = _authServiceRepo.Authenticate(doctorDto.Email, doctorDto.Password);
            if (user == null) return NotFound();

            IssueTokens(user);
            return Ok(user.ToAuthUserDto());
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [Route("Refresh")]
        public IActionResult Refresh()
        {
            if (!Request.Cookies.TryGetValue("refresh_token", out var tokenValue))
                return Unauthorized();

            var stored = _refreshTokenRepo.GetByToken(tokenValue);
            if (stored == null || !stored.IsActive) return Unauthorized();

            var user = _doctorRepo.GetDoctorForAuth(stored.DoctorId);
            if (user == null) return Unauthorized();

            // Rotate: revoke the current token and issue a new pair.
            var newRefresh = _tokenService.CreateRefreshToken(user.Id);
            stored.RevokedAt = DateTime.UtcNow;
            stored.ReplacedByToken = newRefresh.Token;
            _refreshTokenRepo.Update(stored);

            IssueTokens(user, newRefresh);
            return Ok(user.ToAuthUserDto());
        }

        [Authorize]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("Logout")]
        public IActionResult Logout()
        {
            if (Request.Cookies.TryGetValue("refresh_token", out var tokenValue))
            {
                var stored = _refreshTokenRepo.GetByToken(tokenValue);
                if (stored != null && stored.IsActive)
                {
                    stored.RevokedAt = DateTime.UtcNow;
                    _refreshTokenRepo.Update(stored);
                }
            }

            DeleteCookie("access_token");
            DeleteCookie("refresh_token");
            return Ok();
        }

        [Authorize]
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [Route("Me")]
        public IActionResult Me()
        {
            var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? User.FindFirstValue("sub");
            if (idValue == null || !Guid.TryParse(idValue, out var doctorId))
                return Unauthorized();

            var user = _doctorRepo.GetDoctorForAuth(doctorId);
            if (user == null) return Unauthorized();

            return Ok(user.ToAuthUserDto());
        }

        // Issues the access + refresh cookies. If a refresh token is provided (rotation),
        // it is used as-is; otherwise a fresh one is created and persisted.
        private void IssueTokens(Doctor user, RefreshToken? refreshToken = null)
        {
            var accessToken = _tokenService.CreateAccessToken(user);

            if (refreshToken == null)
            {
                refreshToken = _tokenService.CreateRefreshToken(user.Id);
                _refreshTokenRepo.Add(refreshToken);
            }
            else
            {
                _refreshTokenRepo.Add(refreshToken);
            }

            var accessMinutes = int.Parse(_config["Jwt:AccessTokenMinutes"] ?? "15");
            Response.Cookies.Append("access_token", accessToken,
                BuildCookieOptions(DateTime.UtcNow.AddMinutes(accessMinutes)));
            Response.Cookies.Append("refresh_token", refreshToken.Token,
                BuildCookieOptions(refreshToken.ExpiresAt));
        }

        private CookieOptions BuildCookieOptions(DateTime expires)
        {
            var secure = bool.Parse(_config["Cookies:Secure"] ?? "true");
            var sameSite = Enum.Parse<SameSiteMode>(_config["Cookies:SameSite"] ?? "None");
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Expires = expires,
                Path = "/",
            };
        }

        private void DeleteCookie(string name)
        {
            var secure = bool.Parse(_config["Cookies:Secure"] ?? "true");
            var sameSite = Enum.Parse<SameSiteMode>(_config["Cookies:SameSite"] ?? "None");
            Response.Cookies.Append(name, "", new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Expires = DateTime.UtcNow.AddDays(-1),
                Path = "/",
            });
        }
    }
}
