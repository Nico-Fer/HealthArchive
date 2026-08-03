using System.Diagnostics;
using HealthArchiveAPI.Extensions;

namespace HealthArchiveAPI.Middleware
{
    /// <summary>
    /// Una línea estructurada por request. Es la base de la observabilidad de la API:
    /// antes no quedaba registro de ningún request, así que era imposible distinguir
    /// tráfico real de escaneo automatizado, o ver qué endpoint está lento.
    /// </summary>
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        /// <summary>A partir de acá el request se considera lento y se loguea como Warning.</summary>
        private const int SlowRequestMs = 1000;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var correlationId = context.GetOrCreateCorrelationId();
            var stopwatch = Stopwatch.StartNew();

            // El scope hace que TODAS las líneas que se emitan durante el request (las de
            // los controllers incluidas) lleven el mismo correlation id.
            using (_logger.BeginScope(new Dictionary<string, object>
            {
                ["CorrelationId"] = correlationId,
            }))
            {
                try
                {
                    await _next(context);
                }
                finally
                {
                    stopwatch.Stop();
                    Log(context, correlationId, stopwatch.ElapsedMilliseconds);
                }
            }
        }

        private void Log(HttpContext context, string correlationId, long elapsedMs)
        {
            var status = context.Response.StatusCode;
            var path = context.Request.Path.Value ?? "/";

            // El healthcheck de Railway pega cada pocos segundos: a nivel Information
            // ahogaría cualquier otra señal.
            var isHealthCheck = path.StartsWith("/health", StringComparison.OrdinalIgnoreCase);

            var level = isHealthCheck ? LogLevel.Debug
                : status >= 400 || elapsedMs >= SlowRequestMs ? LogLevel.Warning
                : LogLevel.Information;

            if (!_logger.IsEnabled(level)) return;

            _logger.Log(level,
                "{Method} {Path} → {StatusCode} en {ElapsedMs}ms | ip={ClientIp} doctor={DoctorId} consultorio={ConsultorioId} ua={UserAgent} correlation={CorrelationId}",
                context.Request.Method,
                path,
                status,
                elapsedMs,
                context.GetClientIp(),
                context.User.GetDoctorId()?.ToString() ?? "-",
                context.User.GetConsultorioId()?.ToString() ?? "-",
                Truncate(context.Request.Headers.UserAgent.ToString(), 120),
                correlationId);
        }

        // El User-Agent lo controla el cliente y los escaneos suelen mandar cadenas largas.
        private static string Truncate(string value, int max) =>
            string.IsNullOrEmpty(value) ? "-" : value.Length <= max ? value : value[..max];
    }
}
