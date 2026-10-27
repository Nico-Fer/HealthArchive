namespace HealthArchiveAPI.Reminders
{
    /// <summary>
    /// Corre <see cref="ReminderDispatcher"/> cada Reminders:PollMinutes (5). Vive dentro
    /// del container de la API: no hay costo extra en Railway, pero mientras la API está
    /// bajada (workflow `railway down`) no sale nada; la primera pasada al volver pone al día
    /// lo que siga en ventana. Con WhatsApp apagado la pasada sale sin consultar la base.
    /// </summary>
    public class ReminderWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly IConfiguration _config;
        private readonly ILogger<ReminderWorker> _logger;

        public ReminderWorker(IServiceScopeFactory scopes, IConfiguration config, ILogger<ReminderWorker> logger)
        {
            _scopes = scopes;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var minutes = Math.Max(1, _config.GetValue("Reminders:PollMinutes", 5));
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(minutes));

            do
            {
                try
                {
                    using var scope = _scopes.CreateScope();
                    await scope.ServiceProvider
                        .GetRequiredService<ReminderDispatcher>()
                        .RunAsync(DateTime.UtcNow, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Nunca dejar que una excepción mate el worker (por defecto, una excepción
                    // no manejada en un BackgroundService baja toda la API).
                    _logger.LogError(ex, "Falló una pasada de los recordatorios");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
    }
}
