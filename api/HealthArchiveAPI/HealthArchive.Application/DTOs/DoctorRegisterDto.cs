namespace HealthArchive.Application.DTOs
{
    public class DoctorRegisterDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        public string consultoryCode { get; set; }

        /// <summary>Consultorio elegido en el desplegable del registro.</summary>
        public Guid ConsultorioId { get; set; }

        public string Tuition { get; set; }
    }
}
