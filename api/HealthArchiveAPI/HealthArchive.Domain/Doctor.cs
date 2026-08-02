using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthArchive.Domain
{
    public class Doctor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        [EmailAddress(ErrorMessage = "Por favor ingrese un email correcto")]
        public string Email { get; set; }
        // Nunca se serializa: varios endpoints devuelven la entidad Doctor completa y sin
        // esto el hash de la contraseña viaja al cliente. El atributo protege todos los
        // endpoints actuales y los futuros; EF y el login lo siguen leyendo normal.
        [JsonIgnore]
        public string Password { get; set; }
        public Phone? PhoneNumber { get; set; }
        public string Tuition { get; set; }
        public string? Description { get; set; } = "";
        public string Role { get; set; } = "Doctor";

        [ForeignKey("Consultorio")]
        public Guid ConsultorioId { get; set; }
        public Consultorio Consultorio { get; set; }
    }
}
