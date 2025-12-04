using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CommentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CommentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateComment([FromBody] CreateCommentRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Sprawdź czy issue istnieje
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == request.IssueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie istnieje");

            // Sprawdź uprawnienia
            var hasAccess = false;
            if (userRole == "Wlasciciel" && issue.Property.OwnerId == userId)
                hasAccess = true;
            else if (userRole == "Najemca" && issue.ReportedById == userId)
                hasAccess = true;
            else if (userRole == "Serwisant")
            {
                var isAssigned = await _context.IssueServicemen
                    .AnyAsync(iss => iss.IssueId == request.IssueId && iss.ServicemanId == userId);
                hasAccess = isAssigned;
            }

            if (!hasAccess)
                return Forbid();

            var comment = new IssueComment
            {
                Id = Guid.NewGuid(),
                IssueId = request.IssueId,
                AuthorId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.IssueComments.Add(comment);
            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            var response = new CommentResponse
            {
                Id = comment.Id,
                IssueId = comment.IssueId,
                AuthorId = comment.AuthorId,
                AuthorName = $"{user.FirstName} {user.LastName}",
                AuthorRole = userRole,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt
            };

            return Ok(response);
        }

        [HttpGet("issue/{issueId}")]
        [Authorize]
        public async Task<IActionResult> GetCommentsByIssue(Guid issueId)
        {
            var comments = await _context.IssueComments
                .Where(c => c.IssueId == issueId)
                .Include(c => c.Author)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync();

            var responses = new List<CommentResponse>();
            foreach (var comment in comments)
            {
                var roles = await _context.UserRoles
                    .Where(ur => ur.UserId == comment.AuthorId)
                    .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                    .FirstOrDefaultAsync();

                responses.Add(new CommentResponse
                {
                    Id = comment.Id,
                    IssueId = comment.IssueId,
                    AuthorId = comment.AuthorId,
                    AuthorName = $"{comment.Author.FirstName} {comment.Author.LastName}",
                    AuthorRole = roles,
                    Content = comment.Content,
                    CreatedAt = comment.CreatedAt,
                    UpdatedAt = comment.UpdatedAt
                });
            }

            return Ok(responses);
        }
    }
}
