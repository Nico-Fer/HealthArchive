using HealthArchiveAPI.Repository.IRepository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
    }
}
