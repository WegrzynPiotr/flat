using Application.DTOs;
using Core.Interfaces;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/properties/{propertyId}/documents-versioned")]
    [Authorize]
    public class PropertyDocumentsController : ControllerBase
    {
        private readonly IPropertyRepository _propertyRepository;
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;

        public PropertyDocumentsController(
            IPropertyRepository propertyRepository,
            AppDbContext context,
            IWebHostEnvironment env)
        {
            _propertyRepository = propertyRepository;
            _context = context;
            _env = env;
        }

        // Pobierz najnowsze wersje wszystkich dokumentów dla mieszkania
        [HttpGet("latest")]
        public async Task<ActionResult<List<PropertyDocumentResponse>>> GetLatestDocuments(Guid propertyId)
        {
            var property = await _propertyRepository.GetByIdAsync(propertyId);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Tylko właściciel może zobaczyć dokumenty
            if (property.OwnerId != userId)
                return Forbid();

            var latestDocuments = await _context.PropertyDocuments
                .Where(d => d.PropertyId == propertyId && d.IsLatest)
                .OrderBy(d => d.DocumentType)
                .Select(d => new PropertyDocumentResponse
                {
                    Id = d.Id,
                    PropertyId = d.PropertyId,
                    DocumentType = d.DocumentType,
                    FileName = d.FileName,
                    FileUrl = d.FileUrl,
                    UploadedAt = d.UploadedAt,
                    UploadedById = d.UploadedById,
                    UploadedByName = d.UploadedBy != null ? $"{d.UploadedBy.FirstName} {d.UploadedBy.LastName}" : "Unknown",
                    Notes = d.Notes,
                    Version = d.Version
                })
                .ToListAsync();

            return Ok(latestDocuments);
        }

        // Pobierz historię wersji dla konkretnego typu dokumentu
        [HttpGet("history/{documentType}")]
        public async Task<ActionResult<List<PropertyDocumentVersionResponse>>> GetDocumentHistory(Guid propertyId, string documentType)
        {
            var property = await _propertyRepository.GetByIdAsync(propertyId);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            if (property.OwnerId != userId)
                return Forbid();

            var versions = await _context.PropertyDocuments
                .Where(d => d.PropertyId == propertyId && d.DocumentType == documentType)
                .OrderByDescending(d => d.Version)
                .Select(d => new PropertyDocumentVersionResponse
                {
                    Id = d.Id,
                    Version = d.Version,
                    FileName = d.FileName,
                    FileUrl = d.FileUrl,
                    UploadedAt = d.UploadedAt,
                    UploadedById = d.UploadedById,
                    UploadedByName = d.UploadedBy != null ? $"{d.UploadedBy.FirstName} {d.UploadedBy.LastName}" : "Unknown",
                    Notes = d.Notes,
                    IsLatest = d.IsLatest
                })
                .ToListAsync();

            return Ok(versions);
        }

        // Upload nowego dokumentu lub nowej wersji istniejącego
        [HttpPost("{documentType}")]
        public async Task<ActionResult> UploadDocument(
            Guid propertyId, 
            string documentType, 
            [FromForm] IFormFile file,
            [FromForm] string? notes)
        {
            Console.WriteLine($"🟢 PropertyDocumentsController.UploadDocument called");
            Console.WriteLine($"🟢 PropertyId: {propertyId}");
            Console.WriteLine($"🟢 DocumentType: {documentType}");
            Console.WriteLine($"🟢 File: {file?.FileName ?? "NULL"}");
            Console.WriteLine($"🟢 Notes: {notes ?? "NULL"}");

            if (file == null || file.Length == 0)
            {
                Console.WriteLine($"🔴 File is null or empty");
                return BadRequest(new { error = "File is required" });
            }

            var property = await _propertyRepository.GetByIdAsync(propertyId);
            if (property == null)
            {
                Console.WriteLine($"🔴 Property not found");
                return NotFound(new { error = "Property not found" });
            }

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            if (property.OwnerId != userId)
            {
                Console.WriteLine($"🔴 User {userId} is not owner of property");
                return Forbid();
            }

            // Znajdź obecną najnowszą wersję tego typu dokumentu
            var currentLatest = await _context.PropertyDocuments
                .Where(d => d.PropertyId == propertyId && d.DocumentType == documentType && d.IsLatest)
                .FirstOrDefaultAsync();

            int newVersion = currentLatest != null ? currentLatest.Version + 1 : 1;

            // Jeśli istnieje poprzednia wersja, oznacz jako nieaktualną
            if (currentLatest != null)
            {
                currentLatest.IsLatest = false;
                _context.PropertyDocuments.Update(currentLatest);
            }

            // Zapisz plik
            var uploadsFolder = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "property-documents");
            Directory.CreateDirectory(uploadsFolder);

            var extension = Path.GetExtension(file.FileName);
            var uniqueFileName = $"{propertyId}_{documentType}_{newVersion}_{DateTime.UtcNow.Ticks}{extension}";
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var fileUrl = $"{baseUrl}/uploads/property-documents/{uniqueFileName}";

            // Utwórz nowy rekord dokumentu
            var newDocument = new PropertyDocument
            {
                Id = Guid.NewGuid(),
                PropertyId = propertyId,
                DocumentType = documentType,
                FileName = file.FileName,
                FileUrl = fileUrl,
                UploadedAt = DateTime.UtcNow,
                UploadedById = userId,
                Notes = notes ?? string.Empty,
                Version = newVersion,
                IsLatest = true
            };

            _context.PropertyDocuments.Add(newDocument);
            await _context.SaveChangesAsync();

            return Ok(new PropertyDocumentResponse
            {
                Id = newDocument.Id,
                PropertyId = newDocument.PropertyId,
                DocumentType = newDocument.DocumentType,
                FileName = newDocument.FileName,
                FileUrl = newDocument.FileUrl,
                UploadedAt = newDocument.UploadedAt,
                UploadedById = newDocument.UploadedById,
                UploadedByName = $"{User.FindFirst(ClaimTypes.GivenName)?.Value} {User.FindFirst(ClaimTypes.Surname)?.Value}",
                Notes = newDocument.Notes,
                Version = newDocument.Version
            });
        }

        // Usuń konkretną wersję dokumentu
        [HttpDelete("{documentId}")]
        public async Task<ActionResult> DeleteDocument(Guid propertyId, Guid documentId)
        {
            var property = await _propertyRepository.GetByIdAsync(propertyId);
            if (property == null)
                return NotFound();

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            if (property.OwnerId != userId)
                return Forbid();

            var document = await _context.PropertyDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.PropertyId == propertyId);

            if (document == null)
                return NotFound("Document not found");

            // Usuń plik fizyczny
            var fileName = Path.GetFileName(new Uri(document.FileUrl).LocalPath);
            var filePath = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "property-documents", fileName);
            
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
            }

            // Jeśli to była najnowsza wersja, oznacz poprzednią jako najnowszą
            if (document.IsLatest)
            {
                var previousVersion = await _context.PropertyDocuments
                    .Where(d => d.PropertyId == propertyId && 
                               d.DocumentType == document.DocumentType && 
                               d.Version < document.Version)
                    .OrderByDescending(d => d.Version)
                    .FirstOrDefaultAsync();

                if (previousVersion != null)
                {
                    previousVersion.IsLatest = true;
                    _context.PropertyDocuments.Update(previousVersion);
                }
            }

            _context.PropertyDocuments.Remove(document);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
