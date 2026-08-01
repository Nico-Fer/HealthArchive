using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Domain;
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

        public EvolutionController(IEvolutionRepository repository)
        {
            _repository = repository;
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreateEvolution/{hceId}")]
        public IActionResult CreateEvolution(Guid hceId, [FromBody] EvolutionDto evolutionDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (evolutionDto == null) return BadRequest(ModelState);

            Evolution evolution = evolutionDto.ToEntity();
            evolution.HCEId = hceId;

            if (!_repository.CreateEvolution(evolution, hceId))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(evolution);
        }
    }
}
