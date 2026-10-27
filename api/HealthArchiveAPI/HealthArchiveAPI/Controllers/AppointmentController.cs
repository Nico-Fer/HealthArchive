using HealthArchive.Application.DTOs;
using HealthArchive.Application.Interfaces;
using HealthArchive.Application.Mapping;
using HealthArchive.Application.Messaging;
using HealthArchive.Domain;
using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Controllers
{
    /// <summary>
    /// Agenda de turnos del consultorio. Mismo modelo de equipo que las historias clínicas:
    /// cualquier doctor del consultorio ve y maneja los turnos de todos (dar, reprogramar,
    /// cancelar, confirmar asistencia), porque así se cubren entre sí.
    /// </summary>
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentController : ControllerBase
    {
        private const int MaxRangeDays = 31;
        private const int MinDurationMinutes = 5;

        private readonly IAppointmentRepository _repository;
        private readonly IPatientRepository _patients;
        private readonly IDoctorRepository _doctors;
        private readonly IWhatsAppMessageRepository _messages;
        private readonly IWhatsAppSender _whatsApp;

        public AppointmentController(
            IAppointmentRepository repository,
            IPatientRepository patients,
            IDoctorRepository doctors,
            IWhatsAppMessageRepository messages,
            IWhatsAppSender whatsApp)
        {
            _repository = repository;
            _patients = patients;
            _doctors = doctors;
            _messages = messages;
            _whatsApp = whatsApp;
        }

        /// <summary>Turnos entre <paramref name="from"/> y <paramref name="to"/> (UTC, a lo sumo 31 días).</summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [Route("GetAppointments")]
        public IActionResult GetAppointments([FromQuery] DateTime from, [FromQuery] DateTime to, [FromQuery] Guid? doctorId = null)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var fromUtc = AppointmentMapper.AsUtc(from);
            var toUtc = AppointmentMapper.AsUtc(to);
            if (toUtc <= fromUtc || (toUtc - fromUtc).TotalDays > MaxRangeDays)
            {
                return Error(StatusCodes.Status400BadRequest, "invalid_range");
            }

            var appointments = _repository.GetAppointments(consultorioId, fromUtc, toUtc, doctorId);
            return Ok(ToDtos(appointments));
        }

        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Route("CreateAppointment")]
        public IActionResult CreateAppointment([FromBody] AppointmentInputDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var invalid = Validate(dto, consultorioId, null);
            if (invalid != null) return invalid;

            var appointment = dto.ToEntity();
            appointment.ConsultorioId = consultorioId;
            appointment.Status = AppointmentStatus.Pendiente;
            appointment.CreatedByDoctorId = User.GetDoctorId();
            appointment.CreatedAt = DateTime.UtcNow;

            if (!_repository.CreateAppointment(appointment))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(ToDto(_repository.GetAppointment(appointment.Id, consultorioId)!));
        }

        /// <summary>Reprogramar o cambiar de doctor/paciente. Solo turnos pendientes.</summary>
        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Route("UpdateAppointment/{appointmentId}")]
        public IActionResult UpdateAppointment(Guid appointmentId, [FromBody] AppointmentInputDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var appointment = _repository.GetAppointment(appointmentId, consultorioId);
            if (appointment == null) return NotFound();

            if (appointment.Status != AppointmentStatus.Pendiente)
            {
                return Error(StatusCodes.Status400BadRequest, "appointment_not_pending");
            }

            var invalid = Validate(dto, consultorioId, appointmentId);
            if (invalid != null) return invalid;

            var previousStart = appointment.StartsAt;
            var previousPatient = appointment.PatientId;
            var previousDoctor = appointment.DoctorId;
            dto.ApplyTo(appointment);
            // Las navegaciones cargadas siguen apuntando al doctor/paciente anterior: se
            // alinean con los ids nuevos para que EF no tenga dos versiones en conflicto.
            if (appointment.DoctorId != previousDoctor)
            {
                appointment.Doctor = _doctors.GetDoctor(appointment.DoctorId, consultorioId)!;
            }
            if (appointment.PatientId != previousPatient)
            {
                appointment.Patient = appointment.PatientId is Guid pid ? _patients.GetPatient(pid, consultorioId) : null;
            }

            if (!_repository.UpdateAppointment(appointment))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            // Si cambió la fecha (o la persona), el recordatorio que ya salió habla de otro
            // turno: se borra el registro para que el worker mande uno nuevo.
            if (appointment.StartsAt != previousStart || appointment.PatientId != previousPatient)
            {
                _messages.DeletePatientReminder(appointmentId);
            }

            return Ok(ToDto(_repository.GetAppointment(appointmentId, consultorioId)!));
        }

        /// <summary>Pendiente, Ausente o Cancelado. Atendido solo se alcanza por <see cref="CheckIn"/>.</summary>
        [HttpPatch]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("UpdateAppointmentStatus/{appointmentId}")]
        public IActionResult UpdateAppointmentStatus(Guid appointmentId, [FromBody] AppointmentStatusDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            if (!Enum.TryParse<AppointmentStatus>(dto.Status, ignoreCase: true, out var status)
                || !Enum.IsDefined(status)
                || status == AppointmentStatus.Atendido)
            {
                return Error(StatusCodes.Status400BadRequest, "invalid_status");
            }

            var appointment = _repository.GetAppointment(appointmentId, consultorioId);
            if (appointment == null) return NotFound();

            appointment.Status = status;
            if (status == AppointmentStatus.Pendiente) appointment.CheckedInAt = null;

            if (!_repository.UpdateAppointment(appointment))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(ToDto(appointment));
        }

        /// <summary>
        /// Confirma la asistencia y devuelve el paciente, para que el front abra su HCE.
        /// Si el turno era de alguien que todavía no es paciente, lo resuelve en este orden:
        /// un paciente del consultorio con ese DNI (lo vincula) o, si no hay, lo crea con los
        /// datos del turno. Si para crearlo falta la fecha de nacimiento responde
        /// birthdate_required y el front la pide y reintenta con <see cref="CheckInDto"/>.
        /// Idempotente: confirmar un turno ya atendido devuelve el mismo paciente.
        /// </summary>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Route("CheckIn/{appointmentId}")]
        public IActionResult CheckIn(Guid appointmentId, [FromBody] CheckInDto? dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (User.GetConsultorioId() is not Guid consultorioId) return Forbid();

            var appointment = _repository.GetAppointment(appointmentId, consultorioId);
            if (appointment == null) return NotFound();

            if (appointment.Status == AppointmentStatus.Cancelado)
            {
                return Error(StatusCodes.Status400BadRequest, "appointment_cancelled");
            }

            if (appointment.Status == AppointmentStatus.Atendido && appointment.Patient != null)
            {
                return Ok(appointment.Patient);
            }

            var patient = appointment.Patient;
            Patient? newPatient = null;

            if (patient == null)
            {
                if (string.IsNullOrWhiteSpace(appointment.DNI))
                {
                    return Error(StatusCodes.Status400BadRequest, "patient_data_incomplete");
                }

                // Puede haberse dado de alta entre que se dio el turno y hoy.
                patient = _patients.GetPatientByDNI(appointment.DNI, consultorioId);
                if (patient != null)
                {
                    appointment.PatientId = patient.Id;
                    appointment.Patient = patient;
                    appointment.ClearPersonData();
                }
                else
                {
                    var birthDate = appointment.BirthDate ?? dto?.BirthDate;
                    if (birthDate == null)
                    {
                        return Error(StatusCodes.Status400BadRequest, "birthdate_required");
                    }

                    newPatient = appointment.ToNewPatient(birthDate.Value);
                }
            }

            if (!_repository.CheckIn(appointment, newPatient))
            {
                ModelState.AddModelError("", "Something went wrong");
                return StatusCode(500, ModelState);
            }

            return Ok(newPatient ?? patient);
        }

        /// <summary>
        /// Validaciones comunes al alta y a la reprogramación. Si el turno es de alguien
        /// nuevo cuyo DNI ya es de un paciente del consultorio, lo vincula a ese paciente
        /// (deja <c>dto.PatientId</c> seteado): el DNI es la identidad dentro del consultorio.
        /// </summary>
        private IActionResult? Validate(AppointmentInputDto dto, Guid consultorioId, Guid? appointmentId)
        {
            if (dto.DurationMinutes < MinDurationMinutes || dto.DurationMinutes > Appointment.MaxDurationMinutes)
            {
                return Error(StatusCodes.Status400BadRequest, "invalid_duration");
            }

            if (_doctors.GetDoctor(dto.DoctorId, consultorioId) == null)
            {
                return Error(StatusCodes.Status400BadRequest, "doctor_not_found");
            }

            if (dto.PatientId is Guid patientId)
            {
                if (_patients.GetPatient(patientId, consultorioId) == null)
                {
                    return Error(StatusCodes.Status400BadRequest, "patient_not_found");
                }
            }
            else
            {
                var person = dto.NewPatient;
                if (person == null
                    || string.IsNullOrWhiteSpace(person.Name)
                    || string.IsNullOrWhiteSpace(person.LastName)
                    || string.IsNullOrWhiteSpace(person.DNI))
                {
                    return Error(StatusCodes.Status400BadRequest, "patient_data_incomplete");
                }

                var existing = _patients.GetPatientByDNI(person.DNI.Trim(), consultorioId);
                if (existing != null) dto.PatientId = existing.Id;
            }

            if (!dto.AllowOverlap
                && _repository.HasOverlap(dto.DoctorId, AppointmentMapper.AsUtc(dto.StartsAt), dto.DurationMinutes, appointmentId))
            {
                return Error(StatusCodes.Status409Conflict, "appointment_overlap");
            }

            return null;
        }

        private AppointmentDto ToDto(Appointment appointment) =>
            appointment.ToAppointmentDto(_messages.GetPatientReminder(appointment.Id), _whatsApp.IsEnabled);

        private IEnumerable<AppointmentDto> ToDtos(ICollection<Appointment> appointments)
        {
            var reminders = _messages.GetPatientReminders(appointments.Select(a => a.Id));
            return appointments.Select(a =>
                a.ToAppointmentDto(reminders.TryGetValue(a.Id, out var reminder) ? reminder : null, _whatsApp.IsEnabled));
        }

        /// <summary>
        /// El slug envuelto en SerializableError, como en EvolutionController: así el
        /// extractSlug del cliente lo encuentra igual que en un BadRequest(ModelState).
        /// </summary>
        private ObjectResult Error(int status, string slug)
        {
            ModelState.AddModelError("error", slug);
            return StatusCode(status, new SerializableError(ModelState));
        }
    }
}
