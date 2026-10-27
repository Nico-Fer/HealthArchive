namespace HealthArchive.Application.Messaging
{
    /// <summary>
    /// Envío de plantillas de WhatsApp. Solo plantillas: los recordatorios los inicia el
    /// consultorio, y fuera de la ventana de 24 h WhatsApp no deja mandar texto libre.
    /// </summary>
    public interface IWhatsAppSender
    {
        /// <summary>False si WhatsApp:Enabled está apagado: no se manda nada.</summary>
        bool IsEnabled { get; }

        Task<WhatsAppSendResult> SendTemplateAsync(
            string to,
            string templateName,
            IReadOnlyList<string> bodyParameters,
            CancellationToken cancellationToken);
    }

    /// <param name="Transient">
    /// El error puede andar si se reintenta (5xx, 429, red). Un 4xx no: el número o la
    /// plantilla están mal y reintentar solo genera ruido.
    /// </param>
    public record WhatsAppSendResult(bool Success, bool Transient, string? MessageId, string? Error)
    {
        public static WhatsAppSendResult Ok(string? messageId) => new(true, false, messageId, null);
        public static WhatsAppSendResult Fail(bool transient, string error) => new(false, transient, null, error);
    }
}
