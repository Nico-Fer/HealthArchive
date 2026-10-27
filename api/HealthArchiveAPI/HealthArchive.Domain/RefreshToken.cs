using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthArchive.Domain
{
    public class RefreshToken
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public Guid Id { get; set; }

        // Solo el hash (SHA-256, base64): el valor en claro viaja únicamente en la cookie.
        // Con el token en claro en la tabla, cualquiera que leyera la base podía pedir
        // access tokens nuevos aunque se rotara Jwt:Key.
        public string TokenHash { get; set; }
        public Guid DoctorId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Ventana de inactividad, no vida total: se corre hacia adelante en cada rotación
        // y en cada KeepAlive (ver Session:IdleTimeoutMinutes).
        public DateTime ExpiresAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? ReplacedByTokenHash { get; set; }

        public bool IsActive => RevokedAt == null && ExpiresAt > DateTime.UtcNow;
    }
}
