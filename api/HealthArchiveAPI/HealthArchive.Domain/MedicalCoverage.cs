namespace HealthArchive.Domain
{
    public class MedicalCoverage
    {
        public string Number { get; set; }
        public string Coverage { get; set; }

        /// <summary>
        /// Posición dentro del paciente. La 0 es la cobertura principal: es la que se
        /// muestra en el listado de pacientes cuando no entran todas. Lo reasigna
        /// <c>PatientMapper.ApplyTo</c> según el orden en que vienen en el DTO, así
        /// "la primera es la principal" es una invariante y no una convención.
        /// </summary>
        public int Order { get; set; }
    }
}
