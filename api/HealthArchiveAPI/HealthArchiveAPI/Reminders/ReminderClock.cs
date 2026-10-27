using System.Globalization;

namespace HealthArchiveAPI.Reminders
{
    /// <summary>
    /// Hora local de los recordatorios. Las fechas se guardan en UTC, pero "24 h antes",
    /// "a las 7:30" y "no mandar de noche" son horas del consultorio, no del servidor
    /// (Railway corre en UTC).
    /// </summary>
    public static class ReminderClock
    {
        public static readonly CultureInfo Culture = CultureInfo.GetCultureInfo("es-AR");

        /// <summary>Tira si la zona no existe: Program.cs lo llama al arrancar para fallar temprano.</summary>
        public static TimeZoneInfo TimeZone(IConfiguration config) =>
            TimeZoneInfo.FindSystemTimeZoneById(config["Reminders:TimeZone"] ?? "America/Argentina/Buenos_Aires");

        public static TimeSpan TimeOfDay(IConfiguration config, string key, string fallback) =>
            TimeSpan.Parse(config[key] ?? fallback, CultureInfo.InvariantCulture);

        /// <summary>¿Cae en el horario de silencio? Contempla que cruce la medianoche (21 a 8).</summary>
        public static bool IsQuiet(TimeSpan now, TimeSpan start, TimeSpan end) =>
            start <= end ? now >= start && now < end : now >= start || now < end;
    }
}
