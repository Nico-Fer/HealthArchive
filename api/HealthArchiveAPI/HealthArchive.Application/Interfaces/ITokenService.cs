using HealthArchive.Domain;

namespace HealthArchive.Application.Interfaces
{
    public interface ITokenService
    {
        string CreateAccessToken(Doctor doctor);

        /// <summary>
        /// Crea un refresh token nuevo. La entidad lleva solo el hash; <c>Value</c> es el
        /// valor en claro, que va a la cookie y no se guarda en ningún lado.
        /// </summary>
        (RefreshToken Entity, string Value) CreateRefreshToken(Guid doctorId);

        /// <summary>Hash con el que se guarda y se busca un refresh token.</summary>
        string HashRefreshToken(string value);

        /// <summary>
        /// Vencimiento de un refresh token que se emite o se renueva ahora: la sesión
        /// muere si pasa Session:IdleTimeoutMinutes sin que se corra.
        /// </summary>
        DateTime NextRefreshExpiry();
    }
}
