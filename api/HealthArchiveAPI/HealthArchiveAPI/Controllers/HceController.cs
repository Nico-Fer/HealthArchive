using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;

namespace HealthArchiveAPI.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class HceController : ControllerBase
    {
        private readonly IHceRepository _repository;
        private readonly IFileStorage _storage;
        private readonly ILogger<HceController> _logger;

        public HceController(IHceRepository repository, IFileStorage storage, ILogger<HceController> logger)
        {
            _repository = repository;
            _storage = storage;
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
                LogAccesoAjeno("la HCE", hceId, consultorioId);
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
                LogAccesoAjeno("la HCE", hceId, consultorioId);
                return NotFound();
            }

            // El Id se genera acá y no en la base: la clave del objeto lo necesita antes
            // del INSERT. Solo GUIDs en la clave — el nombre del archivo filtra datos del
            // paciente y las claves aparecen en logs y paneles del proveedor.
            var fileId = Guid.NewGuid();
            var storageKey = $"consultorio/{consultorioId}/hce/{hceId}/{fileId}";
            var contentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType;

            string sha256;
            await using (var hashStream = file.OpenReadStream())
            {
                sha256 = Convert.ToHexStringLower(await SHA256.HashDataAsync(hashStream));
            }

            // Primero el bucket, después la fila: si el INSERT falla queda un objeto
            // huérfano invisible (lo levanta la reconciliación); al revés quedaría una
            // fila cuyo contenido no existe, que es un 500 en la cara del médico.
            await using (var uploadStream = file.OpenReadStream())
            {
                await _storage.PutAsync(storageKey, uploadStream, contentType, file.Length);
            }

            var newFile = new HCEFile
            {
                Id = fileId,
                FileName = file.FileName,
                StorageKey = storageKey,
                ContentType = contentType,
                SizeBytes = file.Length,
                Sha256 = sha256,
                HCEId = hceId
            };

            if (!_repository.AddFile(newFile))
            {
                _logger.LogWarning(
                    "Falló el INSERT del adjunto {FileId}: queda huérfano en el bucket con clave {StorageKey}",
                    fileId, storageKey);
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(newFile);
        }

        /// <summary>
        /// Descarga por la API a propósito (no URLs prefirmadas): así la pertenencia al
        /// consultorio se valida acá, con el mismo 404-que-no-confirma-nada del resto.
        /// El porqué completo está en docs/adjuntos-object-storage.md.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DownloadFile/{fileId}")]
        public async Task<IActionResult> DownloadFile(Guid fileId)
        {
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            if (!_repository.FileBelongsToConsultorio(fileId, consultorioId))
            {
                LogAccesoAjeno("el archivo", fileId, consultorioId);
                return NotFound();
            }

            var meta = _repository.GetFileMeta(fileId);
            if (meta == null) return NotFound();

            // attachment siempre: el ContentType lo declaró el browser al subir y no es
            // de confianza para renderizar inline.
            var contentType = meta.ContentType ?? "application/octet-stream";

            if (meta.StorageKey != null)
            {
                var stream = await _storage.GetAsync(meta.StorageKey);
                return File(stream, contentType, meta.FileName);
            }

            // Dual-read transitorio: fila anterior al backfill, el contenido sigue en la base.
            var content = _repository.GetFileContent(fileId);
            if (content == null) return NotFound();

            return File(content, contentType, meta.FileName);
        }

        /// <summary>
        /// Borra un adjunto. Lo puede borrar cualquier doctor del consultorio, no solo el
        /// que lo subió: HCEFile no guarda quién lo cargó, y el modelo del consultorio es
        /// de acceso compartido. Es la diferencia con las evoluciones, donde sí hay autor
        /// registrado y solo él edita.
        /// </summary>
        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DeleteFile/{fileId}")]
        public async Task<IActionResult> DeleteFile(Guid fileId)
        {
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            if (!_repository.FileBelongsToConsultorio(fileId, consultorioId))
            {
                LogAccesoAjeno("el archivo", fileId, consultorioId);
                return NotFound();
            }

            // La clave se lee antes de borrar la fila (después no hay de dónde).
            var meta = _repository.GetFileMeta(fileId);

            if (!_repository.DeleteFile(fileId)) return NotFound();

            // Best-effort: la fila ya no existe, así que para el médico el archivo tampoco.
            // Si esto falla queda un huérfano en el bucket, que barre la reconciliación;
            // reintentar o revertir acá solo agregaría estados a medias.
            if (meta?.StorageKey != null)
            {
                try
                {
                    await _storage.DeleteAsync(meta.StorageKey);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex,
                        "No se pudo borrar el objeto {StorageKey} del bucket: queda huérfano",
                        meta.StorageKey);
                }
            }

            return NoContent();
        }
    }
}
