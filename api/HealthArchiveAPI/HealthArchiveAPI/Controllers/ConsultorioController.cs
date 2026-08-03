using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Controllers
{
    [Authorize]
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class ConsultorioController : ControllerBase
    {
        private readonly IConsultorioRepository _repository;
        private readonly IPasswordHasher _passwordHasher;

        public ConsultorioController(IConsultorioRepository repository, IPasswordHasher passwordHasher)
        {
            _repository = repository;
            _passwordHasher = passwordHasher;
        }

        /// <summary>
        /// Requiere sesión. Fue anónimo mientras el registro tenía un desplegable de
        /// consultorios; ahora el registro se resuelve solo con el código, así que no
        /// queda ningún consumidor anónimo y no hay razón para permitir enumerar los
        /// nombres de los consultorios desde afuera.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [Route("GetConsultorios")]
        public IActionResult GetConsultorios()
        {
            var consultorios = _repository.GetConsultorios()
                .Select(c => c.ToDto())
                .ToList();

            return Ok(consultorios);
        }

        // PENDIENTE (deuda conocida, decidida el 2026-08-02): estos dos endpoints piden
        // rol Admin pero NO verifican que el consultorio sea el del que hace el request.
        // Un Admin del consultorio A puede renombrar o rotarle el código al consultorio B.
        // Es la única parte del sistema que no respeta el aislamiento por consultorio.
        //
        // Se dejó así a propósito mientras haya un solo operador. Al momento de que existan
        // administradores distintos por consultorio, hay que cerrarlo:
        //   - UpdateConsultorio: comparar contra User.GetConsultorioId() y devolver 404 si
        //     no coincide, igual que hace DoctorController con GetDoctor(id, consultorioId).
        //   - CreateConsultorio: definir quién puede crear consultorios nuevos. Un Admin de
        //     consultorio no debería poder; hace falta un rol de sistema por encima, que hoy
        //     no existe (Doctor.Role solo tiene "Doctor" y "Admin").
        [Authorize(Roles = "Admin")]
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Route("CreateConsultorio")]
        public IActionResult CreateConsultorio([FromBody] SaveConsultorioDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (dto == null) return BadRequest();

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                ModelState.AddModelError("error", "name_required");
                return BadRequest(ModelState);
            }

            if (string.IsNullOrWhiteSpace(dto.Code))
            {
                ModelState.AddModelError("error", "code_required");
                return BadRequest(ModelState);
            }

            if (_repository.NameExists(dto.Name))
            {
                ModelState.AddModelError("error", "consultorio_exists");
                return BadRequest(ModelState);
            }

            var consultorio = new Consultorio
            {
                Name = dto.Name,
                // Mismo hasher que las contraseñas: el código no queda en claro en la base.
                CodeHash = _passwordHasher.Hash(dto.Code),
                CreatedAt = DateTime.UtcNow,
            };

            if (!_repository.CreateConsultorio(consultorio))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(consultorio.ToDto());
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdateConsultorio/{consultorioId}")]
        public IActionResult UpdateConsultorio(Guid consultorioId, [FromBody] SaveConsultorioDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (dto == null) return BadRequest();

            var consultorio = _repository.GetConsultorio(consultorioId);
            if (consultorio == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name) && dto.Name != consultorio.Name)
            {
                if (_repository.NameExists(dto.Name))
                {
                    ModelState.AddModelError("error", "consultorio_exists");
                    return BadRequest(ModelState);
                }
                consultorio.Name = dto.Name;
            }

            // Código vacío = no se rota. Así se puede renombrar sin tener que reemitirlo.
            if (!string.IsNullOrWhiteSpace(dto.Code))
            {
                consultorio.CodeHash = _passwordHasher.Hash(dto.Code);
            }

            if (!_repository.UpdateConsultorio(consultorio))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(consultorio.ToDto());
        }
    }
}
