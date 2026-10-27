using HealthArchive.Domain;

namespace HealthArchive.Application.Messaging
{
    /// <summary>
    /// Convierte el teléfono como lo carga el consultorio al formato que exige WhatsApp
    /// (solo dígitos, con código de país). Si no lo puede interpretar con seguridad
    /// devuelve null y el recordatorio no sale: mandarle a un número mal armado es pagar
    /// por un mensaje que le llega a otra persona.
    /// </summary>
    public static class WhatsAppPhone
    {
        public static string? Normalize(Phone? phone)
        {
            if (phone == null) return null;

            var countryCode = Digits(phone.CountryCode);
            var number = Digits(phone.PhoneNumber);
            if (number.Length == 0) return null;

            // El formulario arranca en +54 y la app es argentina: sin código, se asume ese.
            if (countryCode.Length == 0) countryCode = "54";

            return countryCode == "54" ? NormalizeArgentina(number) : NormalizeOther(countryCode, number);
        }

        public static bool HasNumber(Phone? phone) => phone != null && Digits(phone.PhoneNumber).Length > 0;

        /// <summary>Para los logs: nunca el número completo.</summary>
        public static string Mask(string normalized) =>
            normalized.Length <= 4 ? "****" : new string('*', normalized.Length - 4) + normalized[^4..];

        // Los celulares argentinos en WhatsApp son 54 + 9 + característica sin 0 + número sin 15,
        // siempre 10 dígitos nacionales. Se toleran las formas habituales de cargarlo:
        // "11 5000 0000", "011 15 5000 0000", "+54 9 11 5000 0000".
        private static string? NormalizeArgentina(string number)
        {
            if (number.StartsWith("54") && number.Length >= 12) number = number[2..];
            if (number.StartsWith("9") && number.Length == 11) number = number[1..];
            if (number.StartsWith("0")) number = number[1..];

            if (number.Length == 12) number = RemoveFifteen(number);

            return number.Length == 10 ? "549" + number : null;
        }

        // Con el 15 son 12 dígitos: característica (2 a 4) + 15 + número. La única
        // característica de 2 dígitos es la de Buenos Aires (11).
        private static string RemoveFifteen(string number)
        {
            foreach (var areaLength in new[] { 2, 3, 4 })
            {
                if (areaLength == 2 && !number.StartsWith("11")) continue;
                if (number.Substring(areaLength, 2) == "15")
                {
                    return number[..areaLength] + number[(areaLength + 2)..];
                }
            }
            return number;
        }

        private static string? NormalizeOther(string countryCode, string number)
        {
            if (number.StartsWith(countryCode) && number.Length > countryCode.Length + 6) number = number[countryCode.Length..];
            number = number.TrimStart('0');
            var full = countryCode + number;
            return full.Length is >= 8 and <= 15 ? full : null;
        }

        private static string Digits(string? value) =>
            new string((value ?? "").Where(char.IsDigit).ToArray());
    }
}
