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
    public class PatientController : ControllerBase
    {
        private readonly IPatientRepository _repository;

        public PatientController(IPatientRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetPatients")]
        public IActionResult GetPatients([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 30, [FromQuery] string? search = null)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 30; // cota defensiva

            var (items, totalCount) = _repository.GetPatients(consultorioId, pageNumber, pageSize, search);

            var result = new PagedResultDto<Patient>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
            return Ok(result);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreatePatient")]
        public IActionResult CreatePatients([FromBody] PatientDto patientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (patientDto == null) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            // La unicidad del DNI es dentro del consultorio: otro consultorio puede
            // atender legítimamente al mismo paciente.
            if (_repository.PatientsExists(patientDto.DNI, consultorioId))
            {
                ModelState.AddModelError("error", "patient_exists");
                return BadRequest(ModelState);
            }

            var patient = patientDto.ToEntity();
            patient.ConsultorioId = consultorioId;

            if (!_repository.CreatePatient(patient))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(patient);
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetClinicHistory/{dni}")]
        public IActionResult GetClinicHistory(string dni)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var patient = _repository.GetPatientByDNI(dni, consultorioId);
            if (patient == null) return NotFound();

            var hce = _repository.GetClinicHistory(patient.Id, consultorioId);
            if (hce == null) return NotFound();

            return Ok(hce);
        }

        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdatePatientById")]
        public IActionResult UpdatePatientById(Guid patientId, [FromBody] PatientDto patientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (patientDto == null) return BadRequest();
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var patientToUpdate = _repository.GetPatient(patientId, consultorioId);
            if (patientToUpdate == null) return NotFound();

            if (DniPerteneceAOtroPaciente(patientDto.DNI, patientToUpdate, consultorioId))
            {
                ModelState.AddModelError("error", "samedni_differentPatients");
                return BadRequest(ModelState);
            }

            patientDto.ApplyTo(patientToUpdate);

            if (!_repository.UpdatePatient(patientToUpdate))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(patientToUpdate);
        }

        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdatePatientByDni/{dni}")]
        public IActionResult UpdatePatientByDni(string dni, [FromBody] PatientDto patientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (patientDto == null) return BadRequest();
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var patientToUpdate = _repository.GetPatientByDNI(dni, consultorioId);
            if (patientToUpdate == null) return NotFound();

            if (DniPerteneceAOtroPaciente(patientDto.DNI, patientToUpdate, consultorioId))
            {
                ModelState.AddModelError("error", "samedni_differentPatients");
                return BadRequest(ModelState);
            }

            patientDto.ApplyTo(patientToUpdate);

            if (!_repository.UpdatePatient(patientToUpdate))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(patientToUpdate);
        }

        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DeletePatientById")]
        public IActionResult DeletePatientById(Guid patientId)
        {
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            Patient patient = _repository.GetPatient(patientId, consultorioId);
            if (patient == null) return NotFound();

            if (!_repository.DeletePatient(patient))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(patient);
        }

        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DeletePatientByDni/{dni}")]
        public IActionResult DeletePatientByDni(string dni)
        {
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            Patient patient = _repository.GetPatientByDNI(dni, consultorioId);
            if (patient == null) return NotFound();

            if (!_repository.DeletePatient(patient))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(patient);
        }

        /// <summary>
        /// El DNI que se quiere guardar, ¿ya lo tiene OTRO paciente del consultorio?
        /// Si no lo tiene nadie, la búsqueda devuelve null y el DNI está libre — antes
        /// se hacía `auxPatient.Id` sin chequear null, así que cambiar el DNI a uno
        /// libre tiraba NullReferenceException y devolvía 500.
        /// </summary>
        private bool DniPerteneceAOtroPaciente(string dni, Patient patient, Guid consultorioId)
        {
            var existente = _repository.GetPatientByDNI(dni, consultorioId);
            return existente != null && existente.Id != patient.Id;
        }
    }
}
