using AutoMapper;
using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Domain;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatientController : ControllerBase
    {
        private readonly IPatientRepository _repository;
        private readonly IMapper _mapper;

        public PatientController(IPatientRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetPatients")]
        public IActionResult GetPatients()
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var patientsList = _repository.GetPatients();
            return Ok(patientsList);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreatePatient")]
        public IActionResult CreatePatients([FromBody] PatientDto patientDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (patientDto == null) return BadRequest(ModelState);

            if (_repository.PatientsExists(patientDto.DNI))
            {
                ModelState.AddModelError("error", "patient_exists");
                return BadRequest(ModelState);
            }

            var patient = new Patient
            {
                Name = patientDto.Name,
                LastName = patientDto.LastName,
                DNI = patientDto.DNI,
                BirthDate = (DateTime)patientDto.BirthDate,
                Country = patientDto.Country,
                Email = patientDto.Email,
                PhoneNumber = patientDto.PhoneNumber,
                Ocupation = patientDto.Ocupation,
                HomeAddress = patientDto.HomeAddress,
                Note = patientDto.Note,
                MedicalCoverage = patientDto.MedicalCoverage
            };
            if (patient == null) return BadRequest(ModelState);

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

            var patient = _repository.GetPatientByDNI(dni);
            if (patient == null) return BadRequest(ModelState);

            var hce = _repository.GetClinicHistory(patient.Id);
            if (hce == null) return BadRequest(ModelState);

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

            var patientToUpdate = _repository.GetPatient(patientId);
            if (patientToUpdate == null) return NotFound();

            var auxPatient = _repository.GetPatientByDNI(patientDto.DNI);
            if (auxPatient.Id != patientToUpdate.Id)
            {
                ModelState.AddModelError("error", "samedni_differentPatients");
                return BadRequest(ModelState);
            }

            patientToUpdate.Name = patientDto.Name;
            patientToUpdate.LastName = patientDto.LastName;
            patientToUpdate.DNI = patientDto.DNI;
            patientToUpdate.BirthDate = (DateTime)patientDto.BirthDate;
            patientToUpdate.Country = patientDto.Country;
            patientToUpdate.Email = patientDto.Email;
            patientToUpdate.PhoneNumber = patientDto.PhoneNumber;
            patientToUpdate.Ocupation = patientDto.Ocupation;
            patientToUpdate.HomeAddress = patientDto.HomeAddress;
            patientToUpdate.Note = patientDto.Note;
            patientToUpdate.MedicalCoverage = patientDto.MedicalCoverage;

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

            var patientToUpdate = _repository.GetPatientByDNI(dni);
            if (patientToUpdate == null) return NotFound();

            var auxPatient = _repository.GetPatientByDNI(patientDto.DNI);
            if (auxPatient.Id != patientToUpdate.Id)
            {
                ModelState.AddModelError("error", "samedni_differentPatients");
                return BadRequest(ModelState);
            }

            patientToUpdate.Name = patientDto.Name;
            patientToUpdate.LastName = patientDto.LastName;
            patientToUpdate.DNI = patientDto.DNI;
            patientToUpdate.BirthDate = (DateTime)patientDto.BirthDate;
            patientToUpdate.Country = patientDto.Country;
            patientToUpdate.Email = patientDto.Email;
            patientToUpdate.PhoneNumber = patientDto.PhoneNumber;
            patientToUpdate.Ocupation = patientDto.Ocupation;
            patientToUpdate.HomeAddress = patientDto.HomeAddress;
            patientToUpdate.Note = patientDto.Note;
            patientToUpdate.MedicalCoverage = patientDto.MedicalCoverage;

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
            Patient patient = _repository.GetPatient(patientId);
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
            Patient patient = _repository.GetPatientByDNI(dni);
            if (patient == null) return NotFound();

            if (!_repository.DeletePatient(patient))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(patient);
        }
    }
}
