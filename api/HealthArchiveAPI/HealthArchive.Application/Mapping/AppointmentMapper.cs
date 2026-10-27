using HealthArchive.Application.DTOs;
using HealthArchive.Application.Messaging;
using HealthArchive.Domain;

namespace HealthArchive.Application.Mapping
{
    /// <summary>
    /// Mapeo manual entre <see cref="Appointment"/> y sus DTOs.
    /// </summary>
    public static class AppointmentMapper
    {
        public static Appointment ToEntity(this AppointmentInputDto dto)
        {
            var appointment = new Appointment();
            dto.ApplyTo(appointment);
            return appointment;
        }

        /// <summary>
        /// Vuelca el DTO sobre un turno (nuevo o ya trackeado). Id, consultorio, estado y
        /// autoría no se tocan: los decide el controller. Los datos de la persona solo se
        /// copian si el turno no queda vinculado a un paciente; si lo está, se limpian para
        /// que no quede una copia vieja que alguien pueda leer como vigente.
        /// </summary>
        public static void ApplyTo(this AppointmentInputDto dto, Appointment appointment)
        {
            appointment.DoctorId = dto.DoctorId;
            appointment.PatientId = dto.PatientId;
            appointment.StartsAt = AsUtc(dto.StartsAt);
            appointment.DurationMinutes = dto.DurationMinutes;
            appointment.Reason = string.IsNullOrWhiteSpace(dto.Reason) ? null : dto.Reason.Trim();

            var person = dto.PatientId == null ? dto.NewPatient : null;
            appointment.Name = person?.Name?.Trim();
            appointment.LastName = person?.LastName?.Trim();
            appointment.DNI = person?.DNI?.Trim();
            appointment.BirthDate = person?.BirthDate;
            appointment.Email = string.IsNullOrWhiteSpace(person?.Email) ? null : person.Email.Trim();
            appointment.PhoneNumber = WhatsAppPhone.HasNumber(person?.PhoneNumber) ? person!.PhoneNumber : null;
            appointment.WhatsAppOptIn = person?.WhatsAppOptIn ?? false;
        }

        /// <summary>
        /// Paciente nuevo a partir de los datos del turno. Las columnas de texto de Patient
        /// son NOT NULL, por eso lo que no se sabe va como cadena vacía (igual que el alta
        /// desde el formulario). La fecha de nacimiento la tiene que haber resuelto el llamador.
        /// </summary>
        public static Patient ToNewPatient(this Appointment appointment, DateTime birthDate) => new()
        {
            Name = appointment.Name ?? "",
            LastName = appointment.LastName ?? "",
            DNI = appointment.DNI ?? "",
            BirthDate = birthDate,
            Country = "",
            Email = appointment.Email ?? "",
            PhoneNumber = appointment.PhoneNumber == null
                ? new Phone { CountryCode = "+54", PhoneNumber = "" }
                : new Phone { CountryCode = appointment.PhoneNumber.CountryCode, PhoneNumber = appointment.PhoneNumber.PhoneNumber },
            Ocupation = "",
            HomeAddress = "",
            Note = "",
            WhatsAppOptIn = appointment.WhatsAppOptIn,
            ConsultorioId = appointment.ConsultorioId,
        };

        /// <summary>
        /// Una vez vinculado a un paciente, manda el paciente: se borra la copia del turno
        /// para que no quede una versión vieja de los datos que alguien lea como vigente.
        /// </summary>
        public static void ClearPersonData(this Appointment appointment)
        {
            appointment.Name = null;
            appointment.LastName = null;
            appointment.DNI = null;
            appointment.BirthDate = null;
            appointment.Email = null;
            appointment.PhoneNumber = null;
            appointment.WhatsAppOptIn = false;
        }

        /// <param name="reminder">El registro del WhatsApp al paciente, si existe.</param>
        /// <param name="whatsAppEnabled">Si WhatsApp está apagado en este ambiente.</param>
        public static AppointmentDto ToAppointmentDto(this Appointment a, WhatsAppMessage? reminder, bool whatsAppEnabled)
        {
            var patient = a.Patient;
            var phone = patient != null ? patient.PhoneNumber : a.PhoneNumber;
            var optIn = patient?.WhatsAppOptIn ?? a.WhatsAppOptIn;

            return new AppointmentDto
            {
                Id = a.Id,
                DoctorId = a.DoctorId,
                DoctorName = a.Doctor == null ? "" : $"{a.Doctor.Name} {a.Doctor.LastName}",
                PatientId = a.PatientId,
                IsNewPatient = a.PatientId == null,
                Name = patient?.Name ?? a.Name ?? "",
                LastName = patient?.LastName ?? a.LastName ?? "",
                DNI = patient?.DNI ?? a.DNI,
                BirthDate = patient?.BirthDate ?? a.BirthDate,
                Email = patient?.Email ?? a.Email,
                PhoneNumber = phone,
                WhatsAppOptIn = optIn,
                StartsAt = a.StartsAt,
                DurationMinutes = a.DurationMinutes,
                Reason = a.Reason,
                Status = a.Status.ToString(),
                CheckedInAt = a.CheckedInAt,
                CreatedAt = a.CreatedAt,
                Reminder = ReminderOf(a, phone, optIn, reminder, whatsAppEnabled),
            };
        }

        private static AppointmentReminderDto ReminderOf(
            Appointment a, Phone? phone, bool optIn, WhatsAppMessage? reminder, bool whatsAppEnabled)
        {
            if (reminder?.Status == WhatsAppMessageStatus.Sent)
                return new AppointmentReminderDto { State = ReminderStates.Sent, SentAt = reminder.UpdatedAt };

            if (a.Status != AppointmentStatus.Pendiente) return new AppointmentReminderDto { State = ReminderStates.None };
            if (!whatsAppEnabled) return new AppointmentReminderDto { State = ReminderStates.Disabled };
            if (reminder?.Status == WhatsAppMessageStatus.Failed) return new AppointmentReminderDto { State = ReminderStates.Failed };
            if (!WhatsAppPhone.HasNumber(phone)) return new AppointmentReminderDto { State = ReminderStates.NoPhone };
            if (WhatsAppPhone.Normalize(phone) == null) return new AppointmentReminderDto { State = ReminderStates.InvalidPhone };
            if (!optIn) return new AppointmentReminderDto { State = ReminderStates.NoConsent };

            return new AppointmentReminderDto { State = ReminderStates.Scheduled };
        }

        /// <summary>
        /// El front manda ISO con Z (UTC). Si llegara sin zona se toma como UTC igual: el
        /// server no puede saber la hora local del navegador, y en Railway corre en UTC.
        /// </summary>
        public static DateTime AsUtc(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }
}
