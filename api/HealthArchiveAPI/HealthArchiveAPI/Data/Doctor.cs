using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace HealthArchiveAPI.Data
{
    public class Doctor
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }
        public string Name { get; set; }
        public string LastName { get; set; }
        [EmailAddress(ErrorMessage ="Por favor ingrese un email correcto")]
        public string Email { get; set; }
        public string Password { get; set; }
        public Phone? PhoneNumber { get; set; }
        public string Tuition { get; set; }
        public string? Description { get; set; } = "";
    }
}
