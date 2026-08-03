namespace HealthArchive.Application.DTOs
{
    public class DoctorRegisterDto
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        /// <summary>
        /// Único dato que identifica al consultorio en el registro: el backend lo verifica
        /// contra el CodeHash de cada consultorio hasta encontrar el que corresponde.
        /// </summary>
        public string consultoryCode { get; set; }

        public string Tuition { get; set; }
    }
}
