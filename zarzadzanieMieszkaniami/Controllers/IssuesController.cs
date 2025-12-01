using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.DTOs;
using Application.Services;
using Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class IssuesController : ControllerBase
    {
        private readonly IssueService _issueService;

        public IssuesController(IssueService issueService)
        {
            _issueService = issueService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var issues = await _issueService.GetAllIssuesAsync();
            return Ok(issues);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var issue = await _issueService.GetIssueByIdAsync(id);
            if (issue == null)
                return NotFound();

            return Ok(issue);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateIssueRequest request)
        {
            // Pobierz ID zalogowanego użytkownika z JWT tokenu
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userId = !string.IsNullOrEmpty(userIdClaim) ? Guid.Parse(userIdClaim) : Guid.Empty;

            var issue = new Issue
            {
                Id = Guid.NewGuid(),
                Title = request.Title,
                Description = request.Description,
                Category = request.Category,
                Priority = request.Priority,
                Status = "Nowe",
                PropertyId = request.PropertyId,
                ReportedById = userId,
                ReportedAt = DateTime.UtcNow,
                Photos = request.Photos ?? new System.Collections.Generic.List<string>()
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
    }
}
