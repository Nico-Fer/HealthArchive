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

        public EvolutionController(
            IEvolutionRepository repository,
            IHceRepository hceRepository,
            IDoctorRepository doctorRepository)
        {
            _repository = repository;
            _hceRepository = hceRepository;
            _doctorRepository = doctorRepository;
        }

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

            if (!_hceRepository.BelongsToConsultorio(hceId, consultorioId)) return NotFound();

            var autor = DoctorAutenticado(consultorioId);
            if (autor == null) return Forbid();

            Evolution evolution = evolutionDto.ToEntity();
            evolution.HCEId = hceId;
            evolution.EvolutionInfo = FirmaDe(autor);

            if (!_repository.CreateEvolution(evolution, hceId))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(evolution);
        }

        /// <summary>
        /// Edita el texto de una evolución ya cargada. Pensado sobre todo para corregir
        /// datos migrados. Queda registrado quién editó: la firma se reemplaza por la del
        /// doctor que hace el cambio, no se conserva la del autor original.
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

            if (!_repository.BelongsToConsultorio(evolutionId, consultorioId)) return NotFound();

            var evolution = _repository.GetEvolution(evolutionId);
            if (evolution == null) return NotFound();

            var autor = DoctorAutenticado(consultorioId);
            if (autor == null) return Forbid();

            evolution.Notes = evolutionDto.Notes;
            evolution.EvolutionInfo = FirmaDe(autor);
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
