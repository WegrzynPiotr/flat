using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Application.Services;
using Core.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
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
            var issues = await _issueService.GetAllIssuesAsync();

            var result = issues.Select(i => new
            {
                i.Id,
                i.Title,
                i.Description,
                i.Category,
                i.Priority,
                i.Status,
                i.PropertyId,
                i.ReportedById,
                i.ReportedAt,
                i.ResolvedAt,
                i.Photos,
                Property = i.Property != null ? new
                {
                    i.Property.Id,
                    i.Property.Address,
                    i.Property.City
                } : null,
                ReportedBy = i.ReportedBy != null ? new
                {
                    i.ReportedBy.Id,
                    i.ReportedBy.FirstName,
                    i.ReportedBy.LastName,
                    i.ReportedBy.Email
                } : null
            });

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var issue = await _issueService.GetIssueByIdAsync(id);
            if (issue == null)
                return NotFound(new { message = "Issue not found" });

            return Ok(new
            {
                issue.Id,
                issue.Title,
                issue.Description,
                issue.Category,
                issue.Priority,
                issue.Status,
                issue.PropertyId,
                issue.ReportedById,
                issue.ReportedAt,
                issue.ResolvedAt,
                issue.Photos
            });
        }

        // ✅ Endpoint 1: JSON (bez zdjęć)
        [HttpPost]
        [Consumes("application/json")]
        public async Task<IActionResult> CreateJson([FromBody] CreateIssueJsonRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) ||
                string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new { message = "Title and Description are required" });
            }

            var issue = new Issue
            {
                Title = request.Title,
                Description = request.Description,
                Category = request.Category ?? "Inne",
                Priority = request.Priority ?? "Średnia",
                PropertyId = request.PropertyId ?? Guid.Empty,
                ReportedById = request.ReportedById ?? Guid.Empty,
                Photos = request.Photos ?? new List<string>()
            };

            var createdIssue = await _issueService.CreateIssueAsync(issue);

            return CreatedAtAction(nameof(GetById), new { id = createdIssue.Id }, new
            {
                createdIssue.Id,
                createdIssue.Title,
                createdIssue.Description,
                createdIssue.Category,
                createdIssue.Priority,
                createdIssue.Status,
                createdIssue.PropertyId,
                createdIssue.ReportedById,
                createdIssue.ReportedAt,
                createdIssue.Photos
            });
        }

        // ✅ Endpoint 2: multipart/form-data (ze zdjęciami)
        [HttpPost("upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateWithFiles([FromForm] CreateIssueFormRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) ||
                string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new { message = "Title and Description are required" });
            }

            // ✅ Upload zdjęć
            var photoUrls = new List<string>();
            if (request.Photos != null && request.Photos.Count > 0)
            {
                var uploadsFolder = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", "issues");
                Directory.CreateDirectory(uploadsFolder);

                foreach (var photo in request.Photos)
                {
                    if (photo.Length > 0)
                    {
                        var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(photo.FileName)}";
                        var filePath = Path.Combine(uploadsFolder, fileName);

                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await photo.CopyToAsync(stream);
                        }

                        photoUrls.Add($"/uploads/issues/{fileName}");
                    }
                }
            }

            var issue = new Issue
            {
                Title = request.Title,
                Description = request.Description,
                Category = request.Category ?? "Inne",
                Priority = request.Priority ?? "Średnia",
                PropertyId = request.PropertyId ?? Guid.Empty,
                ReportedById = request.ReportedById ?? Guid.Empty,
                Photos = photoUrls
            };

            var createdIssue = await _issueService.CreateIssueAsync(issue);

            return CreatedAtAction(nameof(GetById), new { id = createdIssue.Id }, new
            {
                createdIssue.Id,
                createdIssue.Title,
                createdIssue.Description,
                createdIssue.Category,
                createdIssue.Priority,
                createdIssue.Status,
                createdIssue.PropertyId,
                createdIssue.ReportedById,
                createdIssue.ReportedAt,
                createdIssue.Photos
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateIssueRequest request)
        {
            var issue = await _issueService.GetIssueByIdAsync(id);
            if (issue == null)
                return NotFound(new { message = "Issue not found" });

            issue.Title = request.Title ?? issue.Title;
            issue.Description = request.Description ?? issue.Description;
            issue.Status = request.Status ?? issue.Status;
            issue.Priority = request.Priority ?? issue.Priority;

            await _issueService.UpdateIssueAsync(issue);

            return Ok(new
            {
                issue.Id,
                issue.Title,
                issue.Description,
                issue.Category,
                issue.Priority,
                issue.Status,
                issue.ReportedAt,
                issue.ResolvedAt
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _issueService.DeleteIssueAsync(id);
            return Ok(new { message = "Issue deleted successfully", id });
        }
    }

    // ✅ DTO dla JSON
    public class CreateIssueJsonRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string? Category { get; set; }
        public string? Priority { get; set; }
        public Guid? PropertyId { get; set; }
        public Guid? ReportedById { get; set; }
        public List<string>? Photos { get; set; }
    }

    // ✅ DTO dla multipart/form-data
    public class CreateIssueFormRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string? Category { get; set; }
        public string? Priority { get; set; }
        public Guid? PropertyId { get; set; }
        public Guid? ReportedById { get; set; }
        public List<IFormFile>? Photos { get; set; }
    }

    public class UpdateIssueRequest
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
    }
}
