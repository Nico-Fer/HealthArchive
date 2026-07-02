using AutoMapper;
using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
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
        private readonly IMapper _mapper;

        public EvolutionController(IEvolutionRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreateEvolution/{hceId}")]
        public IActionResult CreateEvolution(Guid hceId, [FromBody] EvolutionDto evolutionDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (evolutionDto == null) return BadRequest(ModelState);

            Evolution evolution = _mapper.Map<Evolution>(evolutionDto);
            if (evolution == null) return BadRequest(ModelState);

            evolution.HCEId = hceId;
            evolution.EvolutionInfo = new EvolutionInfo
            {
                ModifiedBy = evolutionDto.ModifiedBy.ModifiedBy,
                Tuition = evolutionDto.ModifiedBy.Tuition,
            };

            if (!_repository.CreateEvolution(evolution, hceId))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(evolution);
        }
    }
}
