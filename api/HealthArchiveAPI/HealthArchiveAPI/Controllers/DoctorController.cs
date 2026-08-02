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

        public DoctorController(
            IDoctorRepository repository,
            IConsultorioRepository consultorios,
            IPasswordHasher passwordHasher)
        {
            _repository = repository;
            _consultorios = consultorios;
            _passwordHasher = passwordHasher;
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
                ModelState.AddModelError("error", "doctor_exists");
                return BadRequest(ModelState);
            }

            // El código es el perímetro del sistema: un doctor registrado ve todas las
            // historias clínicas de su consultorio. Vive hasheado en la base, así que
            // hay que elegir el consultorio y verificar contra ese (el hash lleva salt,
            // no se puede buscar un consultorio "por su código").
            var consultorio = _consultorios.GetConsultorio(doctorDto.ConsultorioId);
            if (consultorio == null)
            {
                ModelState.AddModelError("error", "consultorio_not_found");
                return BadRequest(ModelState);
            }

            if (string.IsNullOrEmpty(consultorio.CodeHash))
            {
                // Consultorio sin código configurado: no se registra nadie. Si no, un
                // hash vacío haría que la verificación se comportara de forma imprevisible.
                return StatusCode(StatusCodes.Status503ServiceUnavailable);
            }

            if (string.IsNullOrEmpty(doctorDto.consultoryCode) ||
                !_passwordHasher.Verify(consultorio.CodeHash, doctorDto.consultoryCode))
            {
                ModelState.AddModelError("error", "incorrect_code");
                return BadRequest(ModelState);
            }

            var doctor = doctorDto.ToEntity();
            doctor.ConsultorioId = consultorio.Id;
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
