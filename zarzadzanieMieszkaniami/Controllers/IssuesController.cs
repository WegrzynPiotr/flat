using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.DTOs;
using Application.Services;
using Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class IssuesController : ControllerBase
    {
        private readonly IssueService _issueService;
        private readonly IWebHostEnvironment _environment;

        public IssuesController(IssueService issueService, IWebHostEnvironment environment)
        {
            _issueService = issueService;
            _environment = environment;
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
                ReportedById = issue.ReportedById,
                ReportedByName = issue.ReportedBy != null ? $"{issue.ReportedBy.FirstName} {issue.ReportedBy.LastName}" : "Unknown",
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
                ReportedById = issue.ReportedById,
                ReportedByName = issue.ReportedBy != null ? $"{issue.ReportedBy.FirstName} {issue.ReportedBy.LastName}" : "Unknown",
                ReportedAt = issue.ReportedAt,
                ResolvedAt = issue.ResolvedAt,
                Photos = issue.Photos ?? new List<string>()
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
        public async Task<IActionResult> Delete(Guid id)
        {
            await _issueService.DeleteIssueAsync(id);
            return NoContent();
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
    }
}
