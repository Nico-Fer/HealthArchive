using System.IO;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.Repository.IRepository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthArchiveAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class HceController : ControllerBase
    {
        private readonly IHceRepository _repository;

        public HceController(IHceRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetEvolutions/{hceId}")]
        public IActionResult GetEvolutions(Guid hceId)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var evolutions = _repository.GetEvolutions(hceId);
            return Ok(evolutions);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("AddFile/{hceId}")]
        public async Task<IActionResult> UploadFile(Guid hceId, IFormFile file)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if(_repository.GetHce(hceId) == null){
                return NotFound();
            }

            MemoryStream ms = new MemoryStream();
            await file.CopyToAsync(ms);
            var fileBytes = ms.ToArray();

            var newFile = new HCEFile
            {
                FileName = file.FileName,
                Content = fileBytes,
                HCEId = hceId
            };

            if (newFile == null) return BadRequest();

            if (!_repository.AddFile(newFile))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(newFile);
        }
    }
}
