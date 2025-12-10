using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;

namespace zarzadzanieMieszkaniami.Services
{
    public interface IGeocodingService
    {
        Task<(double? Latitude, double? Longitude)> GetCoordinatesAsync(string address, string city, string postalCode);
    }

    public class GeocodingService : IGeocodingService
    {
        private readonly HttpClient _httpClient;

        public GeocodingService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZarzadzanieMieszkaniamiApp/1.0");
        }

        public async Task<(double? Latitude, double? Longitude)> GetCoordinatesAsync(string address, string city, string postalCode)
        {
            try
            {
                // Buduj pełny adres do geokodowania
                var fullAddress = $"{address}, {postalCode} {city}, Poland";
                var encodedAddress = HttpUtility.UrlEncode(fullAddress);
                
                // Nominatim API (OpenStreetMap) - darmowe geokodowanie
                var url = $"https://nominatim.openstreetmap.org/search?q={encodedAddress}&format=json&limit=1";
                
                Console.WriteLine($"🗺️ Geocoding address: {fullAddress}");
                Console.WriteLine($"🗺️ URL: {url}");
                
                var response = await _httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"🗺️ Geocoding failed with status: {response.StatusCode}");
                    return (null, null);
                }
                
                var json = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"🗺️ Geocoding response: {json}");
                
                using var document = JsonDocument.Parse(json);
                var root = document.RootElement;
                
                if (root.GetArrayLength() == 0)
                {
                    Console.WriteLine($"🗺️ No results found for address: {fullAddress}");
                    return (null, null);
                }
                
                var firstResult = root[0];
                var lat = double.Parse(firstResult.GetProperty("lat").GetString()!, 
                    System.Globalization.CultureInfo.InvariantCulture);
                var lon = double.Parse(firstResult.GetProperty("lon").GetString()!, 
                    System.Globalization.CultureInfo.InvariantCulture);
                
                Console.WriteLine($"🗺️ Coordinates found: {lat}, {lon}");
                
                return (lat, lon);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"🗺️ Geocoding error: {ex.Message}");
                return (null, null);
            }
        }
    }
}
