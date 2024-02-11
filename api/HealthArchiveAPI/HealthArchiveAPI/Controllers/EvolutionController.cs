using AutoMapper;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.DTOs;
using HealthArchiveAPI.Mapper;
using HealthArchiveAPI.Repository.IRepository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthArchiveAPI.Controllers
{
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
        [Route("CreateEvolution")]
        public IActionResult CreateEvolution(Guid hceId, [FromBody] EvolutionDto evolutionDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (evolutionDto == null) return BadRequest(ModelState);

            var evolution = _mapper.Map<Evolution>(evolutionDto);
            if (evolution == null) return BadRequest(ModelState);

            evolution.HCEId = hceId;


            if(!_repository.CreateEvolution(evolution, hceId)) 
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(evolution);
        }
    }
}
