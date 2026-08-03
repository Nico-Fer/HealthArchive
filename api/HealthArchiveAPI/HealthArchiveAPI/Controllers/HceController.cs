using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class HceController : ControllerBase
    {
        private readonly IHceRepository _repository;
        private readonly ILogger<HceController> _logger;

        public HceController(IHceRepository repository, ILogger<HceController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        /// <summary>
        /// El 404 no distingue "no existe" de "es de otro consultorio", así que desde
        /// afuera no se puede sondear. Adentro sí importa la diferencia: esta línea es la
        /// única señal de que alguien está pidiendo historias que no le corresponden.
        /// </summary>
        private void LogAccesoAjeno(Guid hceId, Guid consultorioId) =>
            _logger.LogWarning(
                "Acceso denegado a la HCE {HceId}: no pertenece al consultorio {ConsultorioId} (doctor {DoctorId})",
                hceId, consultorioId, User.GetDoctorId());

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("GetEvolutions/{hceId}")]
        public IActionResult GetEvolutions(Guid hceId)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            // 404 y no 403 a propósito: si la historia es de otro consultorio, la respuesta
            // ni siquiera confirma que exista.
            if (!_repository.BelongsToConsultorio(hceId, consultorioId))
            {
                LogAccesoAjeno(hceId, consultorioId);
                return NotFound();
            }

            var evolutions = _repository.GetEvolutions(hceId);
            return Ok(evolutions);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("AddFile/{hceId}")]
        public async Task<IActionResult> UploadFile(Guid hceId, IFormFile file)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            // Antes no se validaba: sin archivo, file.CopyToAsync tiraba
            // NullReferenceException y el endpoint devolvía 500.
            if (file == null || file.Length == 0)
            {
                ModelState.AddModelError("error", "file_required");
                return BadRequest(ModelState);
            }

            if (!_repository.BelongsToConsultorio(hceId, consultorioId))
            {
                LogAccesoAjeno(hceId, consultorioId);
                return NotFound();
            }

            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);

            var newFile = new HCEFile
            {
                FileName = file.FileName,
                Content = ms.ToArray(),
                HCEId = hceId
            };

            if (!_repository.AddFile(newFile))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(newFile);
        }
    }
}
