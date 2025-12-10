using System.Globalization;

namespace zarzadzanieMieszkaniami.Helpers
{
    public static class TextHelper
    {
        /// <summary>
        /// Capitalizes each word in the string (first letter uppercase, rest lowercase)
        /// </summary>
        public static string Capitalize(string? text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return text ?? string.Empty;

            return CultureInfo.CurrentCulture.TextInfo.ToTitleCase(text.ToLower());
        }

        /// <summary>
        /// Capitalizes first and last name and combines them
        /// </summary>
        public static string CapitalizeName(string? firstName, string? lastName)
        {
            var first = Capitalize(firstName);
            var last = Capitalize(lastName);
            return $"{first} {last}".Trim();
        }
    }
}
