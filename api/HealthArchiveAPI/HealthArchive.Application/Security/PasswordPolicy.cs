namespace HealthArchive.Application.Security
{
    /// <summary>
    /// Requisito mínimo de contraseña, compartido por el registro y el cambio de
    /// contraseña. Solo largo: sin reglas de composición, que empujan a contraseñas
    /// predecibles ("Clave2026!") sin aportar entropía real.
    /// </summary>
    public static class PasswordPolicy
    {
        public const int MinLength = 8;

        public static bool IsAcceptable(string? password)
        {
            return !string.IsNullOrWhiteSpace(password) && password.Length >= MinLength;
        }
    }
}
