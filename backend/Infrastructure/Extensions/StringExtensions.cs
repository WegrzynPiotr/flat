using System.Text.RegularExpressions;

namespace Infrastructure.Extensions
{
    /// <summary>
    /// Rozszerzenia dla stringów do konwersji na PostgreSQL naming conventions
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Konwertuje string z PascalCase/camelCase na snake_case dla PostgreSQL
        /// </summary>
        public static string ToSnakeCase(this string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Wstaw underscore przed uppercase letterami i konwertuj na lowercase
            var snakeCase = Regex.Replace(input, "(?<!^)(?=[A-Z])", "_").ToLower();
            return snakeCase;
        }

        /// <summary>
        /// Konwertuje string ze snake_case na PascalCase
        /// </summary>
        public static string ToPascalCase(this string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            var parts = input.Split('_');
            return string.Concat(parts.Select(p => char.ToUpper(p[0]) + p.Substring(1)));
        }
    }
}
