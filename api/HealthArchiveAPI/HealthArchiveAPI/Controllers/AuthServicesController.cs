using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Application.Security;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _config;
        private readonly ILogger<AuthServiceController> _logger;

        public AuthServiceController(
            IAuthServiceRepository authServiceRepo,
            IDoctorRepository doctorRepo,
            ITokenService tokenService,
            IRefreshTokenRepository refreshTokenRepo,
            IPasswordHasher passwordHasher,
            IConfiguration config,
            ILogger<AuthServiceController> logger)
        {
            _authServiceRepo = authServiceRepo;
            _doctorRepo = doctorRepo;
            _tokenService = tokenService;
            _refreshTokenRepo = refreshTokenRepo;
            _passwordHasher = passwordHasher;
            _config = config;
            _logger = logger;
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
            if (user == null)
            {
                // Se loguea el email y la IP, nunca la contraseña: una ráfaga de estas
                // líneas desde una misma IP es un intento de fuerza bruta.
                _logger.LogWarning(
                    "Login fallido para {Email} desde {ClientIp}", doctorDto.Email, HttpContext.GetClientIp());
                return NotFound();
            }

            IssueTokens(user);
            _logger.LogInformation("Login correcto del doctor {DoctorId}", user.Id);
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
            var stored = GetRefreshTokenFromCookie();
            if (stored == null || !stored.IsActive)
            {
                if (stored != null && stored.RevokedAt == null)
                {
                    // Vencido por inactividad: es el camino normal de cualquiera que vuelve
                    // después de Session:IdleTimeoutMinutes, no un evento de seguridad.
                    _logger.LogInformation(
                        "Refresh rechazado: la sesión del doctor {DoctorId} venció por inactividad", stored.DoctorId);
                }
                else
                {
                    // Un token desconocido o ya revocado puede ser una sesión vieja del propio
                    // usuario, pero también un refresh token robado que se intenta reusar.
                    _logger.LogWarning(
                        "Refresh rechazado ({Motivo}) desde {ClientIp}",
                        stored == null ? "token_desconocido" : "token_revocado",
                        HttpContext.GetClientIp());
                }
                return Unauthorized();
            }

            var user = _doctorRepo.GetDoctorForAuth(stored.DoctorId);
            if (user == null)
            {
                _logger.LogWarning(
                    "Refresh con token válido pero el doctor {DoctorId} ya no existe", stored.DoctorId);
                return Unauthorized();
            }

            // Rotate: revoke the current token and issue a new pair. El nuevo nace con la
            // ventana de inactividad completa, así que rotar también la corre.
            var newRefresh = _tokenService.CreateRefreshToken(user.Id);
            stored.RevokedAt = DateTime.UtcNow;
            stored.ReplacedByTokenHash = newRefresh.Entity.TokenHash;
            _refreshTokenRepo.Update(stored);

            IssueTokens(user, newRefresh);
            return Ok(user.ToAuthUserDto());
        }

        /// <summary>
        /// Corre la ventana de inactividad del refresh token sin rotarlo. El front lo llama
        /// cuando detecta actividad del usuario (teclado, mouse) que no generó requests:
        /// sin esto, un médico que escribe una evolución larga sin guardar quedaría
        /// "inactivo" para el server. No rota a propósito: dos pestañas pueden llamarlo a
        /// la vez y rotar haría que una de las dos se quede con un token revocado.
        /// </summary>
        [Authorize]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [Route("KeepAlive")]
        public IActionResult KeepAlive()
        {
            var stored = GetRefreshTokenFromCookie();

            // El access token puede seguir vivo (dura 15 min) aunque la sesión ya haya
            // vencido por inactividad: el 401 hace que el front intente /Refresh, que falla,
            // y lo mande al Login. Que el refresh sea del mismo doctor del access token evita
            // estirar una sesión ajena con cookies mezcladas.
            if (stored == null || !stored.IsActive || stored.DoctorId != User.GetDoctorId())
                return Unauthorized();

            stored.ExpiresAt = _tokenService.NextRefreshExpiry();
            _refreshTokenRepo.Update(stored);
            return NoContent();
        }

        // Anónimo a propósito: con el access token vencido el [Authorize] respondía 401 y el
        // refresh token quedaba vivo hasta vencer. Para revocar alcanza con tener el refresh
        // token, que es justamente lo que se revoca; no expone nada.
        [AllowAnonymous]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("Logout")]
        public IActionResult Logout()
        {
            var stored = GetRefreshTokenFromCookie();
            if (stored != null && stored.IsActive)
            {
                stored.RevokedAt = DateTime.UtcNow;
                _refreshTokenRepo.Update(stored);
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
            if (User.GetDoctorId() is not Guid doctorId) return Unauthorized();

            var user = _doctorRepo.GetDoctorForAuth(doctorId);
            if (user == null) return Unauthorized();

            return Ok(user.ToAuthUserDto());
        }

        /// <summary>
        /// Cambia la contraseña del doctor logueado y cierra todas sus otras sesiones (otros
        /// navegadores o dispositivos, incluida la de quien la haya conseguido). La sesión
        /// actual sigue, con un par de tokens nuevo.
        /// </summary>
        [Authorize]
        [EnableRateLimiting("auth")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [Route("ChangePassword")]
        public IActionResult ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (User.GetDoctorId() is not Guid doctorId) return Unauthorized();

            var user = _doctorRepo.GetDoctorForAuth(doctorId);
            if (user == null) return Unauthorized();

            // 400 y no 401: un 401 haría que el front intente /Refresh y, si no, lo
            // expulse al Login, cuando lo único que pasó es que se equivocó de contraseña.
            if (string.IsNullOrEmpty(dto?.CurrentPassword) || !_passwordHasher.Verify(user.Password, dto.CurrentPassword))
            {
                _logger.LogWarning(
                    "Cambio de contraseña rechazado: contraseña actual incorrecta para el doctor {DoctorId} desde {ClientIp}",
                    user.Id, HttpContext.GetClientIp());
                ModelState.AddModelError("error", "incorrect_password");
                return BadRequest(ModelState);
            }

            if (!PasswordPolicy.IsAcceptable(dto.NewPassword))
            {
                ModelState.AddModelError("error", "weak_password");
                return BadRequest(ModelState);
            }

            user.Password = _passwordHasher.Hash(dto.NewPassword);
            if (!_doctorRepo.UpdateDoctor(user))
            {
                _logger.LogError("No se pudo guardar la contraseña nueva del doctor {DoctorId}", user.Id);
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(StatusCodes.Status500InternalServerError, ModelState);
            }

            _refreshTokenRepo.RevokeAllForDoctor(user.Id);
            IssueTokens(user);

            _logger.LogInformation("El doctor {DoctorId} cambió su contraseña; se cerraron sus otras sesiones", user.Id);
            return NoContent();
        }

        private RefreshToken? GetRefreshTokenFromCookie()
        {
            if (!Request.Cookies.TryGetValue("refresh_token", out var tokenValue) || string.IsNullOrEmpty(tokenValue))
                return null;

            return _refreshTokenRepo.GetByTokenHash(_tokenService.HashRefreshToken(tokenValue));
        }

        // Issues the access + refresh cookies. If a refresh token is provided (rotation),
        // it is used as-is; otherwise a fresh one is created. Either way it is persisted.
        private void IssueTokens(Doctor user, (RefreshToken Entity, string Value)? refreshToken = null)
        {
            var accessToken = _tokenService.CreateAccessToken(user);

            var refresh = refreshToken ?? _tokenService.CreateRefreshToken(user.Id);
            _refreshTokenRepo.Add(refresh.Entity);

            Response.Cookies.Append("access_token", accessToken, BuildCookieOptions());
            Response.Cookies.Append("refresh_token", refresh.Value, BuildCookieOptions());
        }

        // Cookies de sesión (sin Expires): el navegador las borra al cerrarse. El vencimiento
        // real lo decide el server con el exp del JWT y el ExpiresAt del refresh token, que
        // es el que implementa el cierre por inactividad.
        private CookieOptions BuildCookieOptions()
        {
            var secure = bool.Parse(_config["Cookies:Secure"] ?? "true");
            var sameSite = Enum.Parse<SameSiteMode>(_config["Cookies:SameSite"] ?? "None");
            return new CookieOptions
            {
                HttpOnly = true,
                Secure = secure,
                SameSite = sameSite,
                Path = "/",
            };
        }

        private void DeleteCookie(string name)
        {
            var options = BuildCookieOptions();
            options.Expires = DateTime.UtcNow.AddDays(-1);
            Response.Cookies.Append(name, "", options);
        }
    }
}
