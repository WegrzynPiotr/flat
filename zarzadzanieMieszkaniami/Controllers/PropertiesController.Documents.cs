using System;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;

namespace zarzadzanieMieszkaniami.Controllers
{
    // Rozszerzenie PropertiesController o endpointy dla dokumentów
    public partial class PropertiesController
    {
        [HttpPost("{id}/documents")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> UploadDocument(Guid id, [FromForm] IFormFile document)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            if (document == null || document.Length == 0)
                return BadRequest("No document uploaded");

            // Dozwolone formaty: PDF, obrazy, Word, Excel
            var allowedExtensions = new[] { ".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx" };
            var extension = Path.GetExtension(document.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest("Invalid file type");

            var uploadsFolder = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "documents");
            Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await document.CopyToAsync(stream);
            }

            // Dodaj do listy w bazie
            var documents = string.IsNullOrEmpty(property.Documents) 
                ? new List<PropertyDocument>() 
                : JsonSerializer.Deserialize<List<PropertyDocument>>(property.Documents);

            documents.Add(new PropertyDocument
            {
                Filename = uniqueFileName,
                OriginalName = document.FileName,
                UploadedAt = DateTime.UtcNow
            });

            property.Documents = JsonSerializer.Serialize(documents);
            await _propertyRepository.UpdateAsync(property);

            Console.WriteLine($"🟢 Document uploaded: {uniqueFileName} (original: {document.FileName})");

            return Ok(new { 
                filename = uniqueFileName, 
                originalName = document.FileName,
                uploadedAt = DateTime.UtcNow,
                url = $"{Request.Scheme}://{Request.Host}/uploads/documents/{uniqueFileName}"
            });
        }

        [HttpDelete("{id}/documents/{filename}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> DeleteDocument(Guid id, string filename)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            if (property.OwnerId != userId)
                return Forbid();

            // Usuń z listy w bazie
            var documents = string.IsNullOrEmpty(property.Documents) 
                ? new List<PropertyDocument>() 
                : JsonSerializer.Deserialize<List<PropertyDocument>>(property.Documents);
            
            var document = documents.FirstOrDefault(d => d.Filename == filename);
            if (document == null)
                return NotFound("Document not found");

            documents.Remove(document);
            property.Documents = JsonSerializer.Serialize(documents);

            await _propertyRepository.UpdateAsync(property);

            // Usuń plik fizyczny
            var docFilePath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "documents", filename);
            if (System.IO.File.Exists(docFilePath))
            {
                System.IO.File.Delete(docFilePath);
            }

            Console.WriteLine($"🟢 Document deleted: {filename}");

            return NoContent();
        }
    }

    // Helper class dla dokumentów
    public class PropertyDocument
    {
        public string Filename { get; set; }
        public string OriginalName { get; set; }
        public DateTime UploadedAt { get; set; }
    }
}
