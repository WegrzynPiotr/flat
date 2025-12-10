using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using zarzadzanieMieszkaniami.Helpers;

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

            Console.WriteLine($"🔵 CreateComment - Issue ID: {request.IssueId}, User: {userId}, Role: {userRole}");

            // Sprawdź czy issue istnieje
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == request.IssueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie istnieje");

            Console.WriteLine($"🔵 Issue PropertyId: {issue.PropertyId}, Property is null: {issue.Property == null}");
            if (issue.Property != null)
            {
                Console.WriteLine($"🔵 Property OwnerId: {issue.Property.OwnerId}");
            }

            // Sprawdź uprawnienia
            var hasAccess = false;
            
            // Sprawdź czy użytkownik jest właścicielem nieruchomości
            if (issue.Property != null && issue.Property.OwnerId == userId)
            {
                hasAccess = true;
                Console.WriteLine($"🟢 Owner access granted");
            }
            
            // Sprawdź czy użytkownik jest najemcą nieruchomości
            if (!hasAccess)
            {
                var isTenant = await _context.PropertyTenants
                    .AnyAsync(pt => pt.PropertyId == issue.PropertyId && pt.TenantId == userId);
                if (isTenant)
                {
                    hasAccess = true;
                    Console.WriteLine($"🟢 Tenant access granted");
                }
            }
            
            // Sprawdź czy użytkownik jest autorem zgłoszenia
            if (!hasAccess && issue.ReportedById == userId)
            {
                hasAccess = true;
                Console.WriteLine($"🟢 Reporter access granted");
            }
            
            // Sprawdź czy użytkownik jest przypisany do zgłoszenia jako serwisant (niezależnie od roli w JWT)
            if (!hasAccess)
            {
                var isAssigned = await _context.IssueServicemen
                    .AnyAsync(iss => iss.IssueId == request.IssueId && iss.ServicemanId == userId);
                if (isAssigned)
                {
                    hasAccess = true;
                    Console.WriteLine($"🟢 Assigned serviceman access granted");
                }
            }

            if (!hasAccess)
            {
                Console.WriteLine($"🔴 Access denied - hasAccess: false");
                return StatusCode(403, new { message = "Brak uprawnień do dodania komentarza" });
            }

            var comment = new IssueComment
            {
                Id = Guid.NewGuid(),
                IssueId = request.IssueId,
                AuthorId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow
            };

            _context.IssueComments.Add(comment);

            // Jeśli zgłoszenie jest rozwiązane i komentarz NIE jest systemowym komentarzem o zmianie statusu,
            // zmień status na "W trakcie" i dodaj wpis do historii
            var statusChanged = false;
            var isSystemStatusComment = request.Content.StartsWith("Status zmieniony z");
            
            if (issue.Status == "Rozwiązane" && !isSystemStatusComment)
            {
                var oldStatus = issue.Status;
                issue.Status = "W trakcie";
                issue.ResolvedAt = null;
                statusChanged = true;
                Console.WriteLine($"🔄 Issue {issue.Id} status changed from 'Rozwiązane' to 'W trakcie'");

                // Dodaj komentarz systemowy o zmianie statusu
                var statusComment = new IssueComment
                {
                    Id = Guid.NewGuid(),
                    IssueId = request.IssueId,
                    AuthorId = userId,
                    Content = $"Status zmieniony z \"{oldStatus}\" na \"W trakcie\" (wznowiono po dodaniu komentarza)",
                    CreatedAt = DateTime.UtcNow.AddSeconds(1) // +1 sekunda żeby był po komentarzu użytkownika
                };
                _context.IssueComments.Add(statusComment);
            }

            await _context.SaveChangesAsync();

            var user = await _context.Users.FindAsync(userId);

            var response = new CommentResponse
            {
                Id = comment.Id,
                IssueId = comment.IssueId,
                AuthorId = comment.AuthorId,
                AuthorName = TextHelper.CapitalizeName(user.FirstName, user.LastName),
                AuthorRole = userRole,
                Content = comment.Content,
                CreatedAt = comment.CreatedAt,
                UpdatedAt = comment.UpdatedAt,
                StatusChanged = statusChanged
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
                    AuthorName = TextHelper.CapitalizeName(comment.Author.FirstName, comment.Author.LastName),
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
