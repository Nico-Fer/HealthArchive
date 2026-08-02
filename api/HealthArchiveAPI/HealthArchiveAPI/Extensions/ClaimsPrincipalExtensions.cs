using System.Security.Claims;

namespace HealthArchiveAPI.Extensions
{
    /// <summary>
    /// Lectura de la identidad del doctor autenticado desde el JWT. Centralizado acá
    /// porque lo necesitan cuatro controllers y el criterio tiene que ser el mismo en
    /// todos: si cada uno lo resuelve a su manera, el aislamiento se vuelve inconsistente.
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        /// <summary>Nombre del claim con el consultorio, emitido por TokenService.</summary>
        public const string ConsultorioClaim = "consultorio";

        /// <summary>
        /// Id del doctor autenticado. JwtSecurityTokenHandler suele mapear 'sub' a
        /// NameIdentifier, pero no siempre, así que se miran los dos.
        /// </summary>
        public static Guid? GetDoctorId(this ClaimsPrincipal user)
        {
            var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                        ?? user.FindFirstValue("sub");

            return Guid.TryParse(value, out var id) ? id : null;
        }

        /// <summary>
        /// Consultorio del doctor autenticado. Devuelve null si el token es viejo y no
        /// trae el claim, en cuyo caso el llamador debe rechazar el request: es preferible
        /// forzar un re-login a servir datos sin filtrar.
        /// </summary>
        public static Guid? GetConsultorioId(this ClaimsPrincipal user)
        {
            var value = user.FindFirstValue(ConsultorioClaim);

            return Guid.TryParse(value, out var id) ? id : null;
        }
    }
}
