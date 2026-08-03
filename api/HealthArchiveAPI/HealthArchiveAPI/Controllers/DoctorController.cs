using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HealthArchiveAPI.Controllers
{
    [Authorize]
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorController : ControllerBase
    {
        private readonly IDoctorRepository _repository;
        private readonly IConsultorioRepository _consultorios;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ILogger<DoctorController> _logger;

        public DoctorController(
            IDoctorRepository repository,
            IConsultorioRepository consultorios,
            IPasswordHasher passwordHasher,
            ILogger<DoctorController> logger)
        {
            _repository = repository;
            _consultorios = consultorios;
            _passwordHasher = passwordHasher;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetDoctors")]
        public IActionResult GetDoctors()
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var doctorsList = _repository.GetDoctors(consultorioId);
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
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var doctor = _repository.GetDoctor(doctorId, consultorioId);
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
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var doctor = _repository.GetDoctor(email, consultorioId);
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
                _logger.LogWarning("Registro rechazado: el email {Email} ya existe", doctorDto.Email);
                ModelState.AddModelError("error", "doctor_exists");
                return BadRequest(ModelState);
            }

            // El código es el perímetro del sistema: un doctor registrado ve todas las
            // historias clínicas de su consultorio.
            if (string.IsNullOrWhiteSpace(doctorDto.consultoryCode))
            {
                ModelState.AddModelError("error", "incorrect_code");
                return BadRequest(ModelState);
            }

            // El hash lleva salt, así que no se puede resolver el consultorio con una
            // query: hay que verificar el código contra cada uno. Costo: un PBKDF2
            // (~100k iteraciones) por consultorio con código, en cada intento. Es aceptable
            // porque registrarse es raro y el endpoint está bajo la política "auth" del
            // rate limiter (10/min por IP). Si algún día hay decenas de consultorios, la
            // salida es agregar una columna de lookup determinística (HMAC con clave del
            // server) junto al hash con salt, no escanear más rápido.
            var matches = _consultorios.GetConsultoriosWithCode()
                .Where(c => _passwordHasher.Verify(c.CodeHash, doctorDto.consultoryCode))
                .ToList();

            if (matches.Count == 0)
            {
                _logger.LogWarning(
                    "Registro rechazado: código de consultorio incorrecto para {Email}", doctorDto.Email);
                ModelState.AddModelError("error", "incorrect_code");
                return BadRequest(ModelState);
            }

            if (matches.Count > 1)
            {
                // Nada impide hoy que dos consultorios tengan el mismo código (con salt no
                // se puede validar unicidad al escribirlo). Elegir uno en silencio metería
                // al doctor en el consultorio equivocado, que es exactamente la fuga
                // cross-consultorio que todo el modelo de aislamiento evita. Se rechaza.
                _logger.LogError(
                    "Código de consultorio ambiguo: coincide con {Count} consultorios ({Ids}). Hay que rotar uno.",
                    matches.Count,
                    string.Join(", ", matches.Select(c => c.Id)));
                ModelState.AddModelError("error", "ambiguous_code");
                return BadRequest(ModelState);
            }

            var consultorio = matches[0];

            var doctor = doctorDto.ToEntity();
            doctor.ConsultorioId = consultorio.Id;
            doctor.Password = _passwordHasher.Hash(doctor.Password);

            if (!_repository.CreateDoctor(doctor))
            {
                _logger.LogError("No se pudo persistir el doctor {Email}", doctorDto.Email);
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(StatusCodes.Status500InternalServerError, ModelState);
            }

            _logger.LogInformation(
                "Doctor {DoctorId} registrado en el consultorio {ConsultorioId}", doctor.Id, consultorio.Id);

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

            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();
            if (!CanActOn(doctorId)) return Forbid();

            // Scoped: un Admin administra su consultorio, no los ajenos. Si el doctor es
            // de otro consultorio esto devuelve null → 404, que además no filtra si existe.
            var doctorToUpdate = _repository.GetDoctor(doctorId, consultorioId);
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
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();
            if (!CanActOn(doctorId)) return Forbid();

            Doctor doctor = _repository.GetDoctor(doctorId, consultorioId);
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

            return User.GetDoctorId() == doctorId;
        }
    }
}
