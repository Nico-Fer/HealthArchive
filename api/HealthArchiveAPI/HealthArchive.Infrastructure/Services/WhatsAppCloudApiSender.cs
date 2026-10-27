using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HealthArchive.Application.Messaging;
using Microsoft.Extensions.Configuration;

namespace HealthArchive.Infrastructure.Services
{
    /// <summary>
    /// Cliente de la WhatsApp Cloud API de Meta (directo, sin intermediarios: no hay
    /// recargo por mensaje además del de Meta). Es un HttpClient pelado a propósito, sin
    /// SDK ni paquetes: el único endpoint que se usa es POST /{phone-number-id}/messages.
    /// </summary>
    public class WhatsAppCloudApiSender : IWhatsAppSender
    {
        // Códigos de error de Meta que conviene reintentar aunque vengan con 400:
        // límites de throughput/spam y errores genéricos o temporales del servicio.
        private static readonly HashSet<int> TransientErrorCodes = new() { 1, 2, 4, 130429, 131000, 131048, 131056 };

        private readonly HttpClient _http;
        private readonly IConfiguration _config;

        public WhatsAppCloudApiSender(HttpClient http, IConfiguration config)
        {
            _http = http;
            _config = config;
        }

        // Sin GetValue<bool>: está en Configuration.Binder, que este proyecto no referencia.
        public bool IsEnabled => bool.TryParse(_config["WhatsApp:Enabled"], out var enabled) && enabled;

        public async Task<WhatsAppSendResult> SendTemplateAsync(
            string to,
            string templateName,
            IReadOnlyList<string> bodyParameters,
            CancellationToken cancellationToken)
        {
            if (!IsEnabled) return WhatsAppSendResult.Fail(false, "whatsapp_disabled");

            var baseUrl = (_config["WhatsApp:BaseUrl"] ?? "https://graph.facebook.com").TrimEnd('/');
            var url = $"{baseUrl}/{_config["WhatsApp:ApiVersion"]}/{_config["WhatsApp:PhoneNumberId"]}/messages";

            var payload = new
            {
                messaging_product = "whatsapp",
                to,
                type = "template",
                template = new
                {
                    name = templateName,
                    language = new { code = _config["WhatsApp:TemplateLanguage"] ?? "es_AR" },
                    components = new[]
                    {
                        new
                        {
                            type = "body",
                            parameters = bodyParameters.Select(p => new { type = "text", text = p }).ToArray(),
                        },
                    },
                },
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _config["WhatsApp:AccessToken"]);

            try
            {
                using var response = await _http.SendAsync(request, cancellationToken);
                var body = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode) return WhatsAppSendResult.Ok(MessageIdOf(body));

                var (code, message) = ErrorOf(body);
                var transient = (int)response.StatusCode >= 500
                                || response.StatusCode == HttpStatusCode.TooManyRequests
                                || (code is int c && TransientErrorCodes.Contains(c));

                return WhatsAppSendResult.Fail(transient, Truncate($"HTTP {(int)response.StatusCode} code {code}: {message}"));
            }
            catch (HttpRequestException ex)
            {
                return WhatsAppSendResult.Fail(true, Truncate(ex.Message));
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return WhatsAppSendResult.Fail(true, "timeout");
            }
        }

        // Respuesta OK: { "messages": [ { "id": "wamid...." } ] }
        private static string? MessageIdOf(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                return doc.RootElement.GetProperty("messages")[0].GetProperty("id").GetString();
            }
            catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException or IndexOutOfRangeException)
            {
                return null;
            }
        }

        // Error: { "error": { "message": "...", "code": 131026, ... } }
        private static (int? Code, string Message) ErrorOf(string body)
        {
            try
            {
                using var doc = JsonDocument.Parse(body);
                var error = doc.RootElement.GetProperty("error");
                int? code = error.TryGetProperty("code", out var c) && c.TryGetInt32(out var n) ? n : null;
                var message = error.TryGetProperty("message", out var m) ? m.GetString() ?? "" : "";
                return (code, message);
            }
            catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException)
            {
                return (null, body);
            }
        }

        private static string Truncate(string value) => value.Length <= 300 ? value : value[..300];
    }
}
