using HealthArchiveAPI.Extensions;
using Microsoft.AspNetCore.Mvc;

namespace HealthArchiveAPI.Middleware
{
    /// <summary>
    /// El middleware más externo del pipeline. Sin esto, una excepción no manejada caía
    /// al 500 vacío de Kestrel: el cliente no recibía nada útil y en el servidor no
    /// quedaba ningún registro con el que reconstruir qué pasó.
    ///
    /// Además fija el correlation id del request y lo devuelve en el header, para poder
    /// atar el error que ve el usuario con la línea de log del servidor.
    /// </summary>
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _environment;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var correlationId = context.GetOrCreateCorrelationId();
            context.Response.Headers[HttpContextExtensions.CorrelationHeader] = correlationId;

            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Excepción no manejada en {Method} {Path} (correlation {CorrelationId})",
                    context.Request.Method,
                    context.Request.Path,
                    correlationId);

                // Si la respuesta ya empezó a escribirse no se puede reemplazar el body:
                // lo único correcto es cortar y dejar que el log cuente la historia.
                if (context.Response.HasStarted) throw;

                var problem = new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "Error interno del servidor",
                    // El detalle real solo en Development: en producción el mensaje de una
                    // excepción puede filtrar nombres de tablas, rutas o datos de pacientes.
                    Detail = _environment.IsDevelopment()
                        ? ex.ToString()
                        : "Ocurrió un error inesperado. Si el problema persiste, informá el identificador.",
                };
                problem.Extensions["correlationId"] = correlationId;

                context.Response.Clear();
                context.Response.Headers[HttpContextExtensions.CorrelationHeader] = correlationId;
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "application/problem+json";

                await context.Response.WriteAsJsonAsync(problem);
            }
        }
    }
}
