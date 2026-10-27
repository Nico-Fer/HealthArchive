using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    /// <summary>
    /// Igual que <see cref="IPatientRepository"/>: todo lo que usa un endpoint recibe el
    /// consultorio y filtra por él. La excepción documentada es
    /// <see cref="GetPendingForReminders"/>, que usa el worker de recordatorios: corre
    /// fuera de un request y recorre todos los consultorios.
    /// </summary>
    public interface IAppointmentRepository
    {
        /// <summary>Turnos con Doctor y Patient cargados, ordenados por hora.</summary>
        ICollection<Appointment> GetAppointments(Guid consultorioId, DateTime fromUtc, DateTime toUtc, Guid? doctorId);
        Appointment? GetAppointment(Guid id, Guid consultorioId);

        /// <summary>¿El doctor ya tiene otro turno (no cancelado) que se pise con este horario?</summary>
        bool HasOverlap(Guid doctorId, DateTime startsAtUtc, int durationMinutes, Guid? excludeAppointmentId);

        bool CreateAppointment(Appointment appointment);
        bool UpdateAppointment(Appointment appointment);

        /// <summary>
        /// Marca el turno como Atendido y, si viene <paramref name="newPatient"/>, lo crea
        /// (con su HCE) y lo vincula. Todo en un solo SaveChanges: o queda el paciente creado
        /// y el turno atendido, o no queda nada.
        /// </summary>
        bool CheckIn(Appointment appointment, Patient? newPatient);

        /// <summary>
        /// Sin filtrar por consultorio: solo para el worker de recordatorios. Turnos
        /// pendientes que empiezan en el rango, con Doctor, Patient y Consultorio cargados.
        /// </summary>
        ICollection<Appointment> GetPendingForReminders(DateTime fromUtc, DateTime toUtc);

        bool Save();
    }
}
