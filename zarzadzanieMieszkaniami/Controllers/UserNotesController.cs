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
    [Authorize(Roles = "Wlasciciel")]
    public class UserNotesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<UserNotesController> _logger;

        public UserNotesController(AppDbContext context, ILogger<UserNotesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // Pobierz notatkę dla użytkownika
        [HttpGet("{targetUserId}")]
        public async Task<IActionResult> GetNote(Guid targetUserId)
        {
            var ownerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var note = await _context.UserNotes
                .FirstOrDefaultAsync(n => n.OwnerId == ownerId && n.TargetUserId == targetUserId);

            if (note == null)
            {
                return Ok(new UserNoteResponse { TargetUserId = targetUserId, Content = null });
            }

            return Ok(new UserNoteResponse
            {
                Id = note.Id,
                TargetUserId = note.TargetUserId,
                Content = note.Content,
                CreatedAt = note.CreatedAt,
                UpdatedAt = note.UpdatedAt
            });
        }

        // Pobierz wszystkie notatki użytkownika
        [HttpGet]
        public async Task<IActionResult> GetAllNotes()
        {
            var ownerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var notes = await _context.UserNotes
                .Where(n => n.OwnerId == ownerId)
                .Select(n => new UserNoteResponse
                {
                    Id = n.Id,
                    TargetUserId = n.TargetUserId,
                    Content = n.Content,
                    CreatedAt = n.CreatedAt,
                    UpdatedAt = n.UpdatedAt
                })
                .ToListAsync();

            return Ok(notes);
        }

        // Utwórz lub zaktualizuj notatkę
        [HttpPost("{targetUserId}")]
        public async Task<IActionResult> SaveNote(Guid targetUserId, [FromBody] SaveNoteRequest request)
        {
            var ownerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy użytkownik docelowy istnieje i jest naszym najemcą lub serwisantem
            var targetUser = await _context.Users.FindAsync(targetUserId);
            if (targetUser == null)
            {
                return NotFound("Użytkownik nie istnieje");
            }

            // Sprawdź czy mamy relację z tym użytkownikiem
            var isTenant = await _context.PropertyTenants
                .AnyAsync(pt => pt.TenantId == targetUserId && pt.Property.OwnerId == ownerId);

            var isServiceman = await _context.LandlordServicemen
                .AnyAsync(ls => ls.LandlordId == ownerId && ls.ServicemanId == targetUserId);

            var isCreatedByMe = targetUser.CreatedByLandlordId == ownerId;

            if (!isTenant && !isServiceman && !isCreatedByMe)
            {
                return Forbid();
            }

            var existingNote = await _context.UserNotes
                .FirstOrDefaultAsync(n => n.OwnerId == ownerId && n.TargetUserId == targetUserId);

            if (existingNote != null)
            {
                // Aktualizuj istniejącą notatkę
                existingNote.Content = request.Content;
                existingNote.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Utwórz nową notatkę
                var note = new UserNote
                {
                    Id = Guid.NewGuid(),
                    OwnerId = ownerId,
                    TargetUserId = targetUserId,
                    Content = request.Content,
                    CreatedAt = DateTime.UtcNow
                };
                _context.UserNotes.Add(note);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = "Notatka zapisana" });
        }

        // Usuń notatkę
        [HttpDelete("{targetUserId}")]
        public async Task<IActionResult> DeleteNote(Guid targetUserId)
        {
            var ownerId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var note = await _context.UserNotes
                .FirstOrDefaultAsync(n => n.OwnerId == ownerId && n.TargetUserId == targetUserId);

            if (note == null)
            {
                return NotFound("Notatka nie istnieje");
            }

            _context.UserNotes.Remove(note);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notatka usunięta" });
        }
    }

    public class UserNoteResponse
    {
        public Guid? Id { get; set; }
        public Guid TargetUserId { get; set; }
        public string? Content { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class SaveNoteRequest
    {
        public string Content { get; set; }
    }
}
