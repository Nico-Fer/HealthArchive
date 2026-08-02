using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthArchive.Domain
{
    /// <summary>
    /// Unidad de aislamiento del sistema: doctores y pacientes pertenecen a un
    /// consultorio, y un doctor solo ve los pacientes del suyo.
    /// </summary>
    public class Consultorio
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        public string Name { get; set; }

        /// <summary>
        /// Código de alta, hasheado con el mismo <c>IPasswordHasher</c> que las
        /// contraseñas. Como el hash lleva salt, no se puede buscar un consultorio
        /// por su código: hay que elegir el consultorio y verificar contra él.
        /// </summary>
        [JsonIgnore]
        public string CodeHash { get; set; } = "";

        public DateTime CreatedAt { get; set; }
    }
}
