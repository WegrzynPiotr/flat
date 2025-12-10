using System;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Core.Interfaces;
using Core.Models;
using Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using zarzadzanieMieszkaniami.Helpers;
using zarzadzanieMieszkaniami.Services;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public partial class PropertiesController : ControllerBase
    {
        private readonly IPropertyRepository _propertyRepository;
        private readonly IWebHostEnvironment _env;
        private readonly IGeocodingService _geocodingService;

        public PropertiesController(IPropertyRepository propertyRepository, IWebHostEnvironment env, IGeocodingService geocodingService)
        {
            _propertyRepository = propertyRepository;
            _env = env;
            _geocodingService = geocodingService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            Console.WriteLine($"🔵 GetAll properties for user: {userId}, role: {userRole}");
            
            // Pobierz nieruchomości jako właściciel
            var ownedProperties = await _propertyRepository.GetByOwnerIdAsync(userId);
            Console.WriteLine($"🔵 Found {ownedProperties.Count()} owned properties");
            
            // Pobierz nieruchomości jako najemca (dla wszystkich użytkowników, nie tylko z rolą Najemca)
            var tenantProperties = await _propertyRepository.GetByTenantIdAsync(userId);
            Console.WriteLine($"🔵 Found {tenantProperties.Count()} tenant properties");
            
            // Połącz obie listy (bez duplikatów)
            var allProperties = ownedProperties
                .Union(tenantProperties, new PropertyComparer())
                .ToList();
            
            Console.WriteLine($"🔵 Total unique properties: {allProperties.Count}");
            
            var dtos = allProperties.Select(p => PropertyMapper.ToResponse(p, Request, userId)).ToList();
            
            Console.WriteLine($"🔵 Returning {dtos.Count} properties");
            
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetById(Guid id)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var dto = PropertyMapper.ToResponse(property, Request, userId);

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request)
        {
            Console.WriteLine("🔵 POST /properties called");
            Console.WriteLine($"🔵 User claims: {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
            
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            Console.WriteLine($"🔵 Creating property for user: {userId}");
            Console.WriteLine($"🔵 Address: {request.Address}, City: {request.City}, PostalCode: {request.PostalCode}");
            
            // Pobierz współrzędne na podstawie adresu
            Console.WriteLine("🔵 Calling geocoding service...");
            var (latitude, longitude) = await _geocodingService.GetCoordinatesAsync(
                request.Address, request.City, request.PostalCode);
            Console.WriteLine($"🔵 Geocoding result: Lat={latitude}, Lon={longitude}");
            
            var property = new Property
            {
                Id = Guid.NewGuid(),
                Address = request.Address,
                City = request.City,
                PostalCode = request.PostalCode,
                RoomsCount = request.RoomsCount,
                Area = request.Area,
                Description = request.Description,
                OwnerId = userId,
                Photos = "[]", // Pusta tablica JSON
                CreatedAt = DateTime.UtcNow,
                Latitude = latitude,
                Longitude = longitude
            };
            
            var created = await _propertyRepository.AddAsync(property);
            
            var dto = PropertyMapper.ToResponse(created, Request);
            
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, dto);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest request)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            // Sprawdź czy adres się zmienił - jeśli tak, pobierz nowe współrzędne
            var addressChanged = property.Address != request.Address || 
                                 property.City != request.City || 
                                 property.PostalCode != request.PostalCode;
            
            property.Address = request.Address;
            property.City = request.City;
            property.PostalCode = request.PostalCode;
            property.RoomsCount = request.RoomsCount;
            property.Area = request.Area;
            property.Description = request.Description;

            // Jeśli adres się zmienił lub nie ma współrzędnych, pobierz je
            if (addressChanged || property.Latitude == null || property.Longitude == null)
            {
                var (latitude, longitude) = await _geocodingService.GetCoordinatesAsync(
                    request.Address, request.City, request.PostalCode);
                property.Latitude = latitude;
                property.Longitude = longitude;
            }

            await _propertyRepository.UpdateAsync(property);

            var dto = PropertyMapper.ToResponse(property, Request);

            return Ok(dto);
        }

        [HttpPost("{id}/photos")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> UploadPhoto(Guid id, [FromForm] IFormFile photo)
        {
            Console.WriteLine($"🔵 POST /properties/{id}/photos called");
            Console.WriteLine($"🔵 Photo is null: {photo == null}");
            Console.WriteLine($"🔵 Photo length: {photo?.Length ?? 0}");
            Console.WriteLine($"🔵 Photo filename: {photo?.FileName ?? "null"}");
            
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            if (photo == null || photo.Length == 0)
            {
                Console.WriteLine("🔴 No photo file provided");
                return BadRequest("No photo file provided");
            }

            // Zapisz plik
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "properties");
            Console.WriteLine($"🔵 Uploads folder: {uploadsFolder}");
            Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{Guid.NewGuid()}_{Path.GetFileName(photo.FileName)}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);
            Console.WriteLine($"🔵 Saving to: {filePath}");

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await photo.CopyToAsync(stream);
            }

            Console.WriteLine($"🔵 File saved successfully");

            // Aktualizuj Photos w bazie
            var photos = string.IsNullOrEmpty(property.Photos) 
                ? new List<string>() 
                : JsonSerializer.Deserialize<List<string>>(property.Photos);
            
            photos.Add(uniqueFileName);
            property.Photos = JsonSerializer.Serialize(photos);

            await _propertyRepository.UpdateAsync(property);

            Console.WriteLine($"🔵 Database updated, returning URL");
            return Ok(new { fileName = uniqueFileName, url = $"/uploads/properties/{uniqueFileName}" });
        }

        [HttpDelete("{id}/photos/{filename}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> DeletePhoto(Guid id, string filename)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            // Usuń z listy w bazie
            var photos = string.IsNullOrEmpty(property.Photos) 
                ? new List<string>() 
                : JsonSerializer.Deserialize<List<string>>(property.Photos);
            
            if (!photos.Contains(filename))
                return NotFound("Photo not found in property");

            photos.Remove(filename);
            property.Photos = JsonSerializer.Serialize(photos);

            await _propertyRepository.UpdateAsync(property);

            // Usuń plik fizyczny
            var filePath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "properties", filename);
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            // Usuń zdjęcia fizyczne
            if (!string.IsNullOrEmpty(property.Photos))
            {
                var photos = JsonSerializer.Deserialize<List<string>>(property.Photos);
                var uploadsFolder = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "properties");
                
                foreach (var photo in photos)
                {
                    var filePath = Path.Combine(uploadsFolder, photo);
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }
            }

            // Usuń dokumenty fizyczne
            if (!string.IsNullOrEmpty(property.Documents))
            {
                var documents = JsonSerializer.Deserialize<List<PropertyDocumentDto>>(property.Documents);
                var uploadsFolder = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "documents");
                
                foreach (var doc in documents)
                {
                    var filePath = Path.Combine(uploadsFolder, doc.Filename);
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }
            }

            await _propertyRepository.DeleteAsync(id);

            return NoContent();
        }

        [HttpPost("{id}/geocode")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Geocode(Guid id)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            var (latitude, longitude) = await _geocodingService.GetCoordinatesAsync(
                property.Address, property.City, property.PostalCode);
            
            if (latitude == null || longitude == null)
                return BadRequest("Nie udało się ustalić współrzędnych dla podanego adresu");

            property.Latitude = latitude;
            property.Longitude = longitude;
            
            await _propertyRepository.UpdateAsync(property);

            var dto = PropertyMapper.ToResponse(property, Request);

            return Ok(dto);
        }
    }

    // Helper class to compare properties by ID
    public class PropertyComparer : IEqualityComparer<Property>
    {
        public bool Equals(Property? x, Property? y)
        {
            if (x == null || y == null) return false;
            return x.Id == y.Id;
        }

        public int GetHashCode(Property obj)
        {
            return obj.Id.GetHashCode();
        }
    }
}
