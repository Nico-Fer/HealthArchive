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
    [Authorize]
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorController : ControllerBase
    {
        private readonly IDoctorRepository _repository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IConfiguration _config;

        public DoctorController(
            IDoctorRepository repository,
            IPasswordHasher passwordHasher,
            IConfiguration config)
        {
            _repository = repository;
            _passwordHasher = passwordHasher;
            _config = config;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetDoctors")]
        public IActionResult GetDoctors()
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctorsList = _repository.GetDoctors();
            return Ok(doctorsList);
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("GetDoctorByID")]
        public IActionResult GetDoctorById(Guid doctorId)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctor = _repository.GetDoctor(doctorId);
            if (doctor == null) return NotFound();

            return Ok(doctor);
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("GetDoctorByEmail/{email}")]
        public IActionResult GetDoctorByEmail(string email)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctor = _repository.GetDoctor(email);
            if (doctor == null) return NotFound();

            return Ok(doctor);
        }

        [AllowAnonymous]
        [EnableRateLimiting("auth")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreateDoctor")]
        public IActionResult CreateDoctor([FromBody] DoctorRegisterDto doctorDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (doctorDto == null) return BadRequest(ModelState);

            if (_repository.DoctorExists(doctorDto.Email))
            {
                ModelState.AddModelError("error", "doctor_exists");
                return BadRequest(ModelState);
            }

            // El código sale de configuración (env var en el host), no del código fuente:
            // es el único perímetro del sistema, porque cualquier doctor registrado ve
            // todas las historias clínicas.
            var consultoryCode = _config["Registration:ConsultoryCode"];
            if (string.IsNullOrWhiteSpace(consultoryCode))
            {
                // Sin código configurado no se registra nadie. Si no, un código vacío
                // más un consultoryCode nulo en el body compararían iguales y el alta
                // quedaría abierta. En Production esto ni siquiera arranca (ver Program.cs).
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            if (!string.Equals(doctorDto.consultoryCode, consultoryCode, StringComparison.Ordinal))
            {
                ModelState.AddModelError("error", "incorrect_code");
                return BadRequest(ModelState);
            }

            var doctor = doctorDto.ToEntity();
            doctor.Password = _passwordHasher.Hash(doctor.Password);

            if (!_repository.CreateDoctor(doctor))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(doctor);
        }

        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdateDoctorById/{doctorId}")]
        public IActionResult UpdateDoctorById(Guid doctorId, [FromBody] EditDoctorDto doctorDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (doctorDto == null) return BadRequest();

            if (!CanActOn(doctorId)) return Forbid();

            var doctorToUpdate = _repository.GetDoctor(doctorId);
            if (doctorToUpdate == null) return NotFound();

            doctorDto.ApplyTo(doctorToUpdate);

            if (!_repository.UpdateDoctor(doctorToUpdate))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(doctorToUpdate);
        }

        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DeleteDoctorById/{doctorId}")]
        public IActionResult DeleteDoctorById(Guid doctorId)
        {
            if (!CanActOn(doctorId)) return Forbid();

            Doctor doctor = _repository.GetDoctor(doctorId);
            if (doctor == null) return NotFound();

            if (!_repository.DeleteDoctor(doctor))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(doctor);
        }

        /// <summary>
        /// Un doctor solo puede editarse o borrarse a sí mismo; para tocar a otro hace
        /// falta el rol Admin. Sin esto cualquier doctor logueado podía modificar o
        /// eliminar a cualquier otro pasando su GUID en la ruta.
        /// </summary>
        private bool CanActOn(Guid doctorId)
        {
            if (User.IsInRole("Admin")) return true;

            // Mismo patrón que AuthServiceController.Me(): JwtSecurityTokenHandler mapea
            // el claim 'sub' a NameIdentifier, pero no siempre, así que se miran los dos.
            var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                          ?? User.FindFirstValue("sub");

            return Guid.TryParse(idValue, out var currentId) && currentId == doctorId;
        }
    }
}
