namespace HealthArchive.Application.DTOs
{
    /// <summary>
    /// Solo el texto. La firma (quién y con qué matrícula) NO viaja en el body: la
    /// arma el controller con el doctor autenticado, porque si no cualquiera podría
    /// firmar una evolución a nombre de otro profesional.
    ///
    /// El campo ModifiedBy se quitó a propósito: como el proyecto compila con
    /// nullable habilitado, una propiedad de referencia no-nullable queda
    /// implícitamente [Required] y hacía fallar con 400 a cualquier request que
    /// mandara solo las notas.
    /// </summary>
    public class EvolutionDto
    {
        public string Notes { get; set; }
    }
}
