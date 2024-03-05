using HealthArchiveAPI.Repository.IRepository;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Cors;
using HealthArchiveAPI.Mapper;
using AutoMapper;

namespace HealthArchiveAPI.Controllers
{
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class DoctorController : ControllerBase
    {
        private readonly IDoctorRepository _repository;
        private readonly IMapper _mapper;
        
        public DoctorController(IDoctorRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetDoctors")]
        public IActionResult GetDoctors()
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctorsList = _repository.GetDoctors();
            return Ok(doctorsList);
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("GetDoctorByID")]
        public IActionResult GetDoctorById(Guid doctorId)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctor = _repository.GetDoctor(doctorId);
            if(doctor == null) return NotFound();

            return Ok(doctor);
        }

        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("GetDoctorByEmail/{email}")]
        public IActionResult GetDoctorByEmail(string email)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var doctor = _repository.GetDoctor(email);
            if (doctor == null) return NotFound();

            return Ok(doctor);
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("CreateDoctor")]
        public IActionResult CreateDoctor([FromBody] DoctorRegisterDto doctorDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (doctorDto == null) return BadRequest(ModelState);

            if (_repository.DoctorExists(doctorDto.Email))
            {
                ModelState.AddModelError("error", "doctor_exists");
                return BadRequest(ModelState);
            }

            var doctor = _mapper.Map<Doctor>(doctorDto);
            if(doctor == null) return BadRequest(ModelState);

            if (!_repository.CreateDoctor(doctor))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(404, ModelState);
            }

            return Ok(doctor);
        }

        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdateDoctorById")]
        public IActionResult UpdateDoctorById(Guid doctorId, [FromBody] EditDoctorDto doctorDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            if (doctorDto == null ) return BadRequest();

            var doctorToUpdate = _repository.GetDoctor(doctorId);
            if(doctorToUpdate == null) return NotFound();

            _mapper.Map(doctorDto, doctorToUpdate);

            if (!_repository.UpdateDoctor(doctorToUpdate))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(doctorToUpdate);
        }

        [HttpDelete]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("DeleteDoctorById")]
        public IActionResult DeleteDoctorById(Guid doctorId)
        {
            Doctor doctor = _repository.GetDoctor(doctorId);
            if (doctor == null) return NotFound();
            if (!_repository.DeleteDoctor(doctor))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }
            return Ok(doctor);
        }
    }
}
