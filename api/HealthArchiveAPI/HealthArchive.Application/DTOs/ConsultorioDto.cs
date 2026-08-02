namespace HealthArchive.Application.DTOs
{
    /// <summary>
    /// Lo que se expone públicamente de un consultorio, para el desplegable del registro.
    /// Sin CodeHash: la entidad además lo tiene marcado con [JsonIgnore].
    /// </summary>
    public class ConsultorioDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; }
    }

    /// <summary>
    /// Alta y edición de consultorios (solo Admin). El código viaja en claro y se
    /// guarda hasheado.
    /// </summary>
    public class SaveConsultorioDto
    {
        public string Name { get; set; }

        /// <summary>
        /// En la edición es opcional: si viene vacío, se conserva el código actual.
        /// </summary>
        public string? Code { get; set; }
    }
}
