using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Application.DTOs;
using Application.Services;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IssuesController : ControllerBase
    {
        private readonly IssueService _issueService;
        private readonly IWebHostEnvironment _environment;
        private readonly AppDbContext _context;

        public IssuesController(IssueService issueService, IWebHostEnvironment environment, AppDbContext context)
        {
            _issueService = issueService;
            _environment = environment;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            Console.WriteLine("=== GET ALL ISSUES ===");
            
            // Pobierz ID i rolę zalogowanego użytkownika
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim))
            {
                return Unauthorized("User not authenticated");
            }
            
            var userId = Guid.Parse(userIdClaim);
            var userRole = userRoleClaim ?? "Najemca"; // domyślnie Najemca
            
            Console.WriteLine($"User: {userId}, Role: {userRole}");
            
            var issues = await _issueService.GetAllIssuesAsync(userId, userRole);
            var issuesList = issues.ToList();
            Console.WriteLine($"Returning {issuesList.Count} issues");
            
            var dtos = issuesList.Select(issue => new IssueResponse
            {
                Id = issue.Id,
                Title = issue.Title,
                Description = issue.Description,
                Category = issue.Category,
                Priority = issue.Priority,
                Status = issue.Status,
                PropertyId = issue.PropertyId,
                PropertyAddress = issue.Property?.Address ?? "Unknown",
                Property = issue.Property != null ? new PropertyInfo
                {
                    Id = issue.Property.Id,
                    Address = issue.Property.Address,
                    OwnerId = issue.Property.OwnerId,
                    Latitude = issue.Property.Latitude,
                    Longitude = issue.Property.Longitude
                } : null,
                ReportedById = issue.ReportedById,
                ReportedByName = issue.ReportedBy != null ? $"{issue.ReportedBy.FirstName} {issue.ReportedBy.LastName}" : "Unknown",
                AssignedServicemen = issue.AssignedServicemen?.Select(ais => new ServicemanInfo
                {
                    ServicemanId = ais.ServicemanId,
                    ServicemanName = $"{ais.Serviceman?.FirstName} {ais.Serviceman?.LastName}",
                    AssignedAt = ais.AssignedAt
                }).ToList() ?? new List<ServicemanInfo>(),
                ReportedAt = issue.ReportedAt,
                ResolvedAt = issue.ResolvedAt,
                Photos = issue.Photos ?? new List<string>()
            }).ToList();
            
            foreach (var issue in dtos)
            {
                Console.WriteLine($"  Issue: {issue.Id} - {issue.Title}, Photos: {issue.Photos?.Count ?? 0}");
            }
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var issue = await _issueService.GetIssueByIdAsync(id);
            if (issue == null)
                return NotFound();

            var dto = new IssueResponse
            {
                Id = issue.Id,
                Title = issue.Title,
                Description = issue.Description,
                Category = issue.Category,
                Priority = issue.Priority,
                Status = issue.Status,
                PropertyId = issue.PropertyId,
                PropertyAddress = issue.Property?.Address ?? "Unknown",
                Property = issue.Property != null ? new PropertyInfo
                {
                    Id = issue.Property.Id,
                    Address = issue.Property.Address,
                    OwnerId = issue.Property.OwnerId,
                    Latitude = issue.Property.Latitude,
                    Longitude = issue.Property.Longitude
                } : null,
                ReportedById = issue.ReportedById,
                ReportedByName = issue.ReportedBy != null ? $"{issue.ReportedBy.FirstName} {issue.ReportedBy.LastName}" : "Unknown",
                AssignedServicemen = issue.AssignedServicemen?.Select(ais => new ServicemanInfo
                {
                    ServicemanId = ais.ServicemanId,
                    ServicemanName = $"{ais.Serviceman.FirstName} {ais.Serviceman.LastName}",
                    AssignedAt = ais.AssignedAt
                }).ToList() ?? new List<ServicemanInfo>(),
                ReportedAt = issue.ReportedAt,
                ResolvedAt = issue.ResolvedAt,
                Photos = issue.Photos ?? new List<string>(),
                PhotosWithMetadata = issue.PhotosWithMetadata?.Select(p => new PhotoInfo
                {
                    Id = p.Id,
                    Url = p.Url,
                    UploadedById = p.UploadedById,
                    UploadedByName = p.UploadedBy != null ? $"{p.UploadedBy.FirstName} {p.UploadedBy.LastName}" : "Unknown",
                    UploadedAt = p.UploadedAt
                }).ToList() ?? new List<PhotoInfo>()
            };

            return Ok(dto);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromForm] CreateIssueRequest request)
        {
            Console.WriteLine($"=== CREATE ISSUE REQUEST ===");
            Console.WriteLine($"Title: {request.Title}");
            Console.WriteLine($"Description: {request.Description}");
            Console.WriteLine($"Category: {request.Category}");
            Console.WriteLine($"Priority: {request.Priority}");
            Console.WriteLine($"PropertyId: {request.PropertyId}");
            Console.WriteLine($"Photos count: {request.Photos?.Count ?? 0}");
            
            if (request.Photos != null)
            {
                foreach (var photo in request.Photos)
                {
                    Console.WriteLine($"  Photo: {photo.FileName}, Length: {photo.Length}, ContentType: {photo.ContentType}");
                }
            }

            // Pobierz ID zalogowanego użytkownika z JWT tokenu
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = !string.IsNullOrEmpty(userIdClaim) ? Guid.Parse(userIdClaim) : Guid.Empty;

            var uploadedPhotos = await SavePhotosAsync(request.Photos);

            var issue = new Issue
            {
                Title = request.Title,
                Description = request.Description,
                Category = request.Category,
                Priority = request.Priority,
                Status = "Nowe",
                PropertyId = request.PropertyId,
                ReportedById = userId,
                ReportedAt = DateTime.UtcNow,
                Photos = uploadedPhotos
            };

            var createdIssue = await _issueService.CreateIssueAsync(issue);
            return CreatedAtAction(nameof(GetById), new { id = createdIssue.Id }, createdIssue);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Issue issue)
        {
            issue.Id = id;
            await _issueService.UpdateIssueAsync(issue);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            Console.WriteLine($"🔵 DELETE Issue - Issue ID: {id}, User: {userId}");

            // Pobierz usterkę z relacją do nieruchomości
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (issue == null)
            {
                Console.WriteLine($"🔴 Issue not found");
                return NotFound(new { message = "Usterka nie istnieje" });
            }

            Console.WriteLine($"🔵 Issue PropertyId: {issue.PropertyId}, Property is null: {issue.Property == null}");
            if (issue.Property != null)
            {
                Console.WriteLine($"🔵 Property OwnerId: {issue.Property.OwnerId}");
            }

            // Sprawdź czy użytkownik jest właścicielem nieruchomości
            if (issue.Property?.OwnerId != userId)
            {
                Console.WriteLine($"🔴 Access denied - Property owner: {issue.Property?.OwnerId}, User: {userId}");
                return StatusCode(403, new { message = "Tylko właściciel nieruchomości może usunąć tę usterkę" });
            }

            // Usuń pliki zdjęć
            if (issue.Photos != null && issue.Photos.Count > 0)
            {
                foreach (var photoUrl in issue.Photos)
                {
                    var fileName = photoUrl.Split('/').Last();
                    var uploadsPath = Path.Combine(_environment.WebRootPath, "uploads", "issues");
                    var filePath = Path.Combine(uploadsPath, fileName);
                    
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                        Console.WriteLine($"🗑️ Deleted photo: {fileName}");
                    }
                }
            }

            await _issueService.DeleteIssueAsync(id);
            Console.WriteLine($"🟢 Issue deleted successfully");
            return NoContent();
        }

        [HttpPost("{id}/photos")]
        [Authorize]
        public async Task<IActionResult> AddPhoto(Guid id, [FromForm] IFormFile photo)
        {
            if (photo == null || photo.Length == 0)
            {
                return BadRequest(new { message = "Nie przesłano zdjęcia" });
            }

            Console.WriteLine($"📸 Received photo: FileName={photo.FileName}, ContentType={photo.ContentType}, Length={photo.Length}");

            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (issue == null)
                return NotFound(new { message = "Usterka nie istnieje" });

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Sprawdź uprawnienia - właściciel nieruchomości, zgłaszający lub przypisany serwisant
            bool hasAccess = false;
            
            if (userRole == "Wlasciciel" && issue.Property?.OwnerId == userId)
            {
                hasAccess = true;
            }
            else if (issue.ReportedById == userId)
            {
                hasAccess = true;
            }
            else if (userRole == "Serwisant" && issue.AssignedServicemen?.Any(a => a.ServicemanId == userId) == true)
            {
                hasAccess = true;
            }

            if (!hasAccess)
            {
                return StatusCode(403, new { message = "Brak uprawnień do dodania zdjęcia" });
            }

            // Zapisz zdjęcie
            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }

            var uploadsPath = Path.Combine(webRootPath, "uploads", "issues");
            Directory.CreateDirectory(uploadsPath);

            var extension = Path.GetExtension(photo.FileName);
            if (string.IsNullOrEmpty(extension))
            {
                // Jeśli brak rozszerzenia, spróbuj określić z ContentType
                extension = photo.ContentType switch
                {
                    "image/jpeg" => ".jpg",
                    "image/png" => ".png",
                    "image/gif" => ".gif",
                    "image/webp" => ".webp",
                    _ => ".jpg"
                };
            }
            
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsPath, fileName);
            
            Console.WriteLine($"📸 Saving as: {fileName} in {uploadsPath}");

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await photo.CopyToAsync(stream);
            }

            var relativePath = Path.Combine("uploads", "issues", fileName).Replace("\\", "/");
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var photoUrl = $"{baseUrl}/{relativePath}";

            // Dodaj URL do listy zdjęć (legacy - dla kompatybilności)
            if (issue.Photos == null)
            {
                issue.Photos = new List<string>();
            }
            issue.Photos.Add(photoUrl);

            // Dodaj zdjęcie z metadanymi do nowej tabeli
            var issuePhoto = new IssuePhoto
            {
                Id = Guid.NewGuid(),
                IssueId = id,
                Url = photoUrl,
                UploadedById = userId,
                UploadedAt = DateTime.UtcNow
            };
            
            _context.IssuePhotos.Add(issuePhoto);
            await _context.SaveChangesAsync();

            await _issueService.UpdateIssueAsync(issue);

            Console.WriteLine($"📸 Added photo to issue {id}: {fileName}");
            return Ok(new { photoUrl, message = "Zdjęcie zostało dodane" });
        }

        private async Task<List<string>> SavePhotosAsync(List<IFormFile>? files)
        {
            var photoUrls = new List<string>();
            if (files == null || files.Count == 0)
            {
                return photoUrls;
            }

            var webRootPath = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
            {
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }

            var uploadsPath = Path.Combine(webRootPath, "uploads");
            Directory.CreateDirectory(uploadsPath);

            foreach (var file in files)
            {
                if (file == null || file.Length == 0)
                {
                    continue;
                }

                var extension = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{extension}";
                var filePath = Path.Combine(uploadsPath, fileName);

                await using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                var relativePath = Path.Combine("uploads", fileName).Replace("\\", "/");
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                photoUrls.Add($"{baseUrl}/{relativePath}");
            }

            return photoUrls;
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Serwisant,Wlasciciel")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateIssueStatusRequest request)
        {
            var issue = await _issueService.GetIssueByIdAsync(id);
            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            Console.WriteLine($"🔵 UpdateStatus - Issue ID: {id}, User: {userId}, Role: {userRole}");
            Console.WriteLine($"🔵 Issue PropertyId: {issue.PropertyId}, Property is null: {issue.Property == null}");
            if (issue.Property != null)
            {
                Console.WriteLine($"🔵 Property OwnerId: {issue.Property.OwnerId}");
            }

            // Serwisant może aktualizować tylko swoje zgłoszenia
            if (userRole == "Serwisant")
            {
                var isAssigned = issue.AssignedServicemen?.Any(ais => ais.ServicemanId == userId) ?? false;
                if (!isAssigned)
                    return StatusCode(403, new { message = "Nie jesteś przypisany do tego zgłoszenia" });
            }
            // Właściciel może aktualizować zgłoszenia ze swoich nieruchomości
            else if (userRole == "Wlasciciel")
            {
                if (issue.Property?.OwnerId != userId)
                {
                    Console.WriteLine($"🔴 Access denied - Property owner: {issue.Property?.OwnerId}, User: {userId}");
                    return StatusCode(403, new { message = "Nie jesteś właścicielem tej nieruchomości" });
                }
            }

            issue.Status = request.Status;
            if (request.Status == "Rozwiązane" && !issue.ResolvedAt.HasValue)
            {
                issue.ResolvedAt = DateTime.UtcNow;
            }

            await _issueService.UpdateIssueAsync(issue);

            return Ok(new { message = "Status został zaktualizowany", status = issue.Status });
        }
    }
}
