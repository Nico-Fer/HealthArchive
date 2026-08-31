using HealthArchive.Application.DTOs;
using HealthArchive.Domain;

namespace HealthArchive.Application.Mapping
{
    /// <summary>
    /// Mapeo manual entre <see cref="Patient"/> y <see cref="PatientDto"/>.
    /// </summary>
    public static class PatientMapper
    {
        public static Patient ToEntity(this PatientDto dto)
        {
            var patient = new Patient();
            dto.ApplyTo(patient);
            return patient;
        }

        /// <summary>
        /// Vuelca el DTO sobre una entidad ya trackeada por EF (update parcial).
        /// Id y ClinicHistory no se tocan: no viajan en el DTO.
        /// </summary>
        public static void ApplyTo(this PatientDto dto, Patient patient)
        {
            patient.Name = dto.Name;
            patient.LastName = dto.LastName;
            patient.DNI = dto.DNI;
            // El DTO la declara nullable pero la entidad no: si viene null es un
            // request inválido y revienta acá, igual que antes.
            patient.BirthDate = (DateTime)dto.BirthDate;
            patient.Country = dto.Country;
            patient.Email = dto.Email;
            patient.PhoneNumber = dto.PhoneNumber;
            patient.Ocupation = dto.Ocupation;
            patient.HomeAddress = dto.HomeAddress;
            patient.Note = dto.Note;
            // Se reemplaza la colección entera (EF borra las viejas e inserta las nuevas) y
            // el Order se reasigna por posición: así "la primera es la principal" no depende
            // de que el cliente mande bien el campo. Las filas totalmente vacías se descartan
            // para que un renglón de más en el formulario no genere una cobertura fantasma.
            patient.MedicalCoverages = (dto.MedicalCoverages ?? new List<MedicalCoverage>())
                .Where(c => !string.IsNullOrWhiteSpace(c.Coverage) || !string.IsNullOrWhiteSpace(c.Number))
                .Select((c, i) => new MedicalCoverage
                {
                    Coverage = c.Coverage,
                    Number = c.Number,
                    Order = i,
                })
                .ToList();
        }
    }
}
