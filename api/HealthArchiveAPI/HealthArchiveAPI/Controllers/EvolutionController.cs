using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class EvolutionController : ControllerBase
    {
        private readonly IEvolutionRepository _repository;
        private readonly IHceRepository _hceRepository;
        private readonly IDoctorRepository _doctorRepository;
        private readonly ILogger<EvolutionController> _logger;

        public EvolutionController(
            IEvolutionRepository repository,
            IHceRepository hceRepository,
            IDoctorRepository doctorRepository,
            ILogger<EvolutionController> logger)
        {
            _repository = repository;
            _hceRepository = hceRepository;
            _doctorRepository = doctorRepository;
            _logger = logger;
        }

        /// <summary>
        /// El 404 no distingue "no existe" de "es de otro consultorio", así que desde
        /// afuera no se puede sondear. Adentro sí importa la diferencia: esta línea es la
        /// única señal de que alguien está pidiendo recursos que no le corresponden.
        /// </summary>
        private void LogAccesoAjeno(string recurso, Guid id, Guid consultorioId) =>
            _logger.LogWarning(
                "Acceso denegado a {Recurso} {RecursoId}: no pertenece al consultorio {ConsultorioId} (doctor {DoctorId})",
                recurso, id, consultorioId, User.GetDoctorId());

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("CreateEvolution/{hceId}")]
        public IActionResult CreateEvolution(Guid hceId, [FromBody] EvolutionDto evolutionDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (evolutionDto == null) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            if (!_hceRepository.BelongsToConsultorio(hceId, consultorioId))
            {
                LogAccesoAjeno("la HCE", hceId, consultorioId);
                return NotFound();
            }

            var autor = DoctorAutenticado(consultorioId);
            if (autor == null) return Forbid();

            Evolution evolution = evolutionDto.ToEntity();
            evolution.HCEId = hceId;
            evolution.EvolutionInfo = FirmaDe(autor);
            evolution.CreatedByDoctorId = autor.Id;

            if (!_repository.CreateEvolution(evolution, hceId))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(evolution);
        }

        /// <summary>
        /// Edita el texto de una evolución ya cargada. <b>Solo la puede editar el doctor
        /// que la creó</b> — ni siquiera un Admin: una evolución es la palabra de un
        /// profesional sobre un paciente y nadie más la firma.
        ///
        /// Por eso la firma (<see cref="EvolutionInfo"/>) ya no se reasigna: como el que
        /// edita es siempre el autor, reescribirla no aporta nada, y la versión anterior
        /// de este método la pisaba con la del editor y perdía al autor original.
        ///
        /// Las evoluciones sin <c>CreatedByDoctorId</c> (las anteriores a esta regla y las
        /// migradas de SQL Server) no las edita nadie: sin autor identificable no hay a
        /// quién habilitar.
        /// </summary>
        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdateEvolution/{evolutionId}")]
        public IActionResult UpdateEvolution(Guid evolutionId, [FromBody] EvolutionDto evolutionDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (evolutionDto == null) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            if (!_repository.BelongsToConsultorio(evolutionId, consultorioId))
            {
                LogAccesoAjeno("la evolución", evolutionId, consultorioId);
                return NotFound();
            }

            var evolution = _repository.GetEvolution(evolutionId);
            if (evolution == null) return NotFound();

            // Acá alcanza con el id del claim: a diferencia del create, no hay que armar
            // ninguna firma, así que no hace falta ir a buscar el Doctor a la base.
            if (User.GetDoctorId() is not Guid doctorId) return Forbid();

            if (evolution.CreatedByDoctorId is not Guid autorId || autorId != doctorId)
            {
                // 403 y no 404: que la evolución existe y es de este consultorio ya quedó
                // confirmado arriba, así que negarlo ahora no oculta nada. El slug viaja en
                // el ModelState para que el front pueda explicar por qué no se pudo guardar.
                _logger.LogWarning(
                    "Edición rechazada de la evolución {EvolutionId}: el doctor {DoctorId} no es el autor (autor: {AutorId})",
                    evolutionId, doctorId, evolution.CreatedByDoctorId);

                ModelState.AddModelError("error", "not_evolution_author");
                // SerializableError y no ModelState pelado: StatusCode() serializa el
                // ModelStateDictionary tal cual (con rawValue, validationState y demás
                // internals), y con esa forma el extractSlug del cliente no encuentra el
                // slug. Envuelto queda { "error": ["not_evolution_author"] }, que es lo
                // mismo que produce BadRequest(ModelState) en el resto de los endpoints.
                return StatusCode(StatusCodes.Status403Forbidden, new SerializableError(ModelState));
            }

            evolution.Notes = evolutionDto.Notes;
            evolution.ModifiedDate = DateTime.UtcNow;

            if (!_repository.UpdateEvolution(evolution))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(evolution);
        }

        private Doctor DoctorAutenticado(Guid consultorioId)
        {
            return User.GetDoctorId() is Guid doctorId
                ? _doctorRepository.GetDoctor(doctorId, consultorioId)
                : null;
        }

        private static EvolutionInfo FirmaDe(Doctor doctor) => new()
        {
            ModifiedBy = $"{doctor.Name} {doctor.LastName}",
            Tuition = doctor.Tuition,
        };
    }
}
