using HealthArchiveAPI.DTOs;
using HealthArchiveAPI.Data;
using HealthArchiveAPI.Mapper;
using HealthArchiveAPI.Repository.IRepository;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using AutoMapper;

namespace HealthArchiveAPI.Controllers
{
    [EnableCors("CorsRules")]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthServiceController : ControllerBase
    {
        private readonly IAuthServiceRepository _authServiceRepo;
        private readonly IMapper _mapper;

        public AuthServiceController(IAuthServiceRepository authServiceRepo, IMapper mapper)
        {
            _authServiceRepo = authServiceRepo;
            _mapper = mapper;
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("Login")]
        public IActionResult Login([FromBody] DoctorLoginDto doctorDto)
        {
            Doctor user = _authServiceRepo.Authenticate(doctorDto.Email, doctorDto.Password);
            if (user == null) return NotFound();

            EditDoctorDto doctor = new EditDoctorDto
            {
                Name = user.Name,
                LastName = user.LastName,
                Description = user.Description, 
                PhoneNumber = user.PhoneNumber,
            };

            return Ok(doctor);
        }
    }
}
