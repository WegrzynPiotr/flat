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
            
            // Sprawdź dostęp: właściciel lub najemca
            var isOwner = property.OwnerId == userId;
            var isTenant = await _context.PropertyTenants
                .AnyAsync(pt => pt.PropertyId == propertyId && pt.TenantId == userId);
            
            if (!isOwner && !isTenant)
                return Forbid();

            // Pobierz dokumenty
            List<PropertyDocumentResponse> latestDocuments;

            // Dla najemców - pokazujemy najnowszą wersję dokumentu dodaną W ICH OKRESIE wynajmu
            // Dla właścicieli - pokazujemy po prostu najnowsze wersje (IsLatest = true)
            if (!isOwner)
            {
                var tenancy = await _context.PropertyTenants
                    .Where(pt => pt.PropertyId == propertyId && pt.TenantId == userId)
                    .FirstOrDefaultAsync();
                
                if (tenancy != null)
                {
                    // Daty umowy są przechowywane jako lokalne (polski czas).
                    // Musimy przekonwertować je na UTC do porównania z UploadedAt (które jest w UTC).
                    // Polska: UTC+1 (zima) lub UTC+2 (lato)
                    
                    var polandTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
                    
                    // StartDate: początek dnia w polskim czasie, przekonwertowany na UTC
                    var startDatePoland = tenancy.StartDate.Date; // Początek dnia StartDate w polskim czasie
                    var startDate = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(startDatePoland, DateTimeKind.Unspecified), polandTimeZone);
                    
                    // EndDate: koniec dnia w polskim czasie, przekonwertowany na UTC
                    DateTime endDate;
                    if (tenancy.EndDate.HasValue)
                    {
                        var endDatePoland = tenancy.EndDate.Value.Date.AddDays(1).AddTicks(-1); // Koniec dnia EndDate (23:59:59.9999999 polski czas)
                        endDate = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(endDatePoland, DateTimeKind.Unspecified), polandTimeZone);
                    }
                    else
                    {
                        endDate = DateTime.MaxValue;
                    }
                    
                    Console.WriteLine($"📄 Tenant {userId} documents filter: StartDate={startDate} UTC, EndDate={endDate} UTC, OriginalEndDate={tenancy.EndDate}");
                    
                    // Dla najemcy: znajdź wszystkie dokumenty w ich okresie, pogrupuj po typie i weź najnowszy z każdego typu
                    var documentsInPeriod = await _context.PropertyDocuments
                        .Where(d => d.PropertyId == propertyId && d.UploadedAt >= startDate && d.UploadedAt <= endDate)
                        .OrderByDescending(d => d.UploadedAt)
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
                    
                    // Grupujemy po typie dokumentu i bierzemy najnowszy z każdego typu (w okresie najemcy)
                    latestDocuments = documentsInPeriod
                        .GroupBy(d => d.DocumentType)
                        .Select(g => g.First()) // Już posortowane malejąco po dacie, więc First() da najnowszy
                        .OrderBy(d => d.DocumentType)
                        .ToList();
                    
                    Console.WriteLine($"📄 Documents in tenant period: {documentsInPeriod.Count}, grouped to: {latestDocuments.Count}");
                }
                else
                {
                    latestDocuments = new List<PropertyDocumentResponse>();
                }
            }
            else
            {
                // Dla właściciela - standardowe pobieranie najnowszych wersji
                latestDocuments = await _context.PropertyDocuments
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
            }
            
            Console.WriteLine($"📄 Returning {latestDocuments.Count} documents:");
            foreach (var doc in latestDocuments)
            {
                Console.WriteLine($"   - {doc.DocumentType}: {doc.FileName}, UploadedAt={doc.UploadedAt}");
            }

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
            
            // Sprawdź dostęp: właściciel lub najemca
            var isOwner = property.OwnerId == userId;
            var isTenant = await _context.PropertyTenants
                .AnyAsync(pt => pt.PropertyId == propertyId && pt.TenantId == userId);
            
            if (!isOwner && !isTenant)
                return Forbid();

            // Pobierz wersje dokumentu
            var versionsQuery = _context.PropertyDocuments
                .Where(d => d.PropertyId == propertyId && d.DocumentType == documentType);

            // Filtruj dla najemców - tylko wersje z ich okresu wynajmu
            // Sprawdzamy czy użytkownik NIE jest właścicielem (niezależnie od jego globalnej roli)
            if (!isOwner)
            {
                var tenancy = await _context.PropertyTenants
                    .Where(pt => pt.PropertyId == propertyId && pt.TenantId == userId)
                    .FirstOrDefaultAsync();
                
                if (tenancy != null)
                {
                    // Daty umowy są przechowywane jako lokalne (polski czas).
                    // Musimy przekonwertować je na UTC do porównania z UploadedAt (które jest w UTC).
                    var polandTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
                    
                    // StartDate: początek dnia w polskim czasie, przekonwertowany na UTC
                    var startDatePoland = tenancy.StartDate.Date;
                    var startDate = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(startDatePoland, DateTimeKind.Unspecified), polandTimeZone);
                    
                    // EndDate: koniec dnia w polskim czasie, przekonwertowany na UTC
                    DateTime endDate;
                    if (tenancy.EndDate.HasValue)
                    {
                        var endDatePoland = tenancy.EndDate.Value.Date.AddDays(1).AddTicks(-1); // Koniec dnia EndDate (23:59:59.9999999 polski czas)
                        endDate = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(endDatePoland, DateTimeKind.Unspecified), polandTimeZone);
                    }
                    else
                    {
                        endDate = DateTime.MaxValue;
                    }
                    
                    Console.WriteLine($"📄 Tenant {userId} document history filter: StartDate={startDate} UTC, EndDate={endDate} UTC");
                    
                    versionsQuery = versionsQuery
                        .Where(d => d.UploadedAt >= startDate && d.UploadedAt <= endDate);
                }
            }

            var versions = await versionsQuery
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
            
            // Sprawdź dostęp: właściciel lub najemca
            var isOwner = property.OwnerId == userId;
            var isTenant = await _context.PropertyTenants
                .AnyAsync(pt => pt.PropertyId == propertyId && pt.TenantId == userId);
            
            if (!isOwner && !isTenant)
            {
                Console.WriteLine($"🔴 User {userId} is not owner or tenant of property");
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
            
            var document = await _context.PropertyDocuments
                .FirstOrDefaultAsync(d => d.Id == documentId && d.PropertyId == propertyId);

            if (document == null)
                return NotFound("Document not found");

            // Sprawdź dostęp: właściciel nieruchomości lub osoba która przesłała dokument
            var isOwner = property.OwnerId == userId;
            var isUploader = document.UploadedById == userId;
            
            if (!isOwner && !isUploader)
                return Forbid();

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
