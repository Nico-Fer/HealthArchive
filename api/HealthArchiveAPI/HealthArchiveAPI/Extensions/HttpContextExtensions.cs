namespace HealthArchiveAPI.Extensions
{
    /// <summary>
    /// Datos del request que necesitan tanto los middlewares de observabilidad como los
    /// controllers. Centralizado para que el correlation id sea uno solo por request y
    /// la IP se lea siempre igual.
    /// </summary>
    public static class HttpContextExtensions
    {
        public const string CorrelationHeader = "X-Correlation-Id";

        private const string CorrelationItemKey = "__CorrelationId";

        /// <summary>
        /// Correlation id del request. Respeta el que venga del cliente (permite seguir
        /// una traza que arranca en el navegador) y si no, genera uno.
        /// </summary>
        public static string GetOrCreateCorrelationId(this HttpContext context)
        {
            if (context.Items.TryGetValue(CorrelationItemKey, out var existing) && existing is string cached)
            {
                return cached;
            }

            var incoming = context.Request.Headers[CorrelationHeader].ToString();
            // Se acota el largo: el header lo controla el cliente y termina en los logs.
            var correlationId = !string.IsNullOrWhiteSpace(incoming) && incoming.Length <= 64
                ? incoming
                : Guid.NewGuid().ToString("N");

            context.Items[CorrelationItemKey] = correlationId;
            return correlationId;
        }

        /// <summary>
        /// IP del cliente. Es la real gracias a UseForwardedHeaders; sin eso, detrás del
        /// proxy de Railway todos los requests parecerían venir de la misma dirección.
        /// </summary>
        public static string GetClientIp(this HttpContext context) =>
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
