using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InvitationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<InvitationsController> _logger;

        public InvitationsController(AppDbContext context, UserManager<User> userManager, ILogger<InvitationsController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        /// <summary>
        /// Wysyła zaproszenie do użytkownika (tylko dla właścicieli mieszkań)
        /// </summary>
        [HttpPost("send")]
        public async Task<IActionResult> SendInvitation([FromBody] SendInvitationRequest request)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Sprawdź czy użytkownik jest właścicielem jakiegoś mieszkania
            var hasProperty = await _context.Properties.AnyAsync(p => p.OwnerId == currentUserId);
            if (!hasProperty)
            {
                return BadRequest("Tylko właściciele mieszkań mogą wysyłać zaproszenia");
            }

            if (request.InvitationType != "Najemca" && request.InvitationType != "Serwisant")
            {
                return BadRequest("Nieprawidłowy typ zaproszenia. Dozwolone: Najemca, Serwisant");
            }

            // Znajdź użytkownika po emailu
            var invitee = await _userManager.FindByEmailAsync(request.Email);
            if (invitee == null)
            {
                return NotFound("Nie znaleziono użytkownika o podanym adresie email");
            }

            if (invitee.Id == currentUserId)
            {
                return BadRequest("Nie możesz zaprosić samego siebie");
            }

            // Sprawdź czy już istnieje oczekujące zaproszenie
            var existingInvitation = await _context.UserInvitations
                .FirstOrDefaultAsync(i => 
                    i.InviterId == currentUserId && 
                    i.InviteeId == invitee.Id && 
                    i.InvitationType == request.InvitationType &&
                    i.Status == "Pending");

            if (existingInvitation != null)
            {
                return BadRequest("Już wysłałeś zaproszenie do tego użytkownika");
            }

            // Sprawdź czy użytkownik już jest dodany (dla serwisantów)
            if (request.InvitationType == "Serwisant")
            {
                var alreadyServiceman = await _context.LandlordServicemen
                    .AnyAsync(ls => ls.LandlordId == currentUserId && ls.ServicemanId == invitee.Id);
                if (alreadyServiceman)
                {
                    return BadRequest("Ten użytkownik jest już Twoim serwisantem");
                }
            }

            // Sprawdź czy użytkownik już jest najemcą (zaakceptował wcześniej zaproszenie lub został utworzony przez właściciela)
            if (request.InvitationType == "Najemca")
            {
                var alreadyTenantByInvitation = await _context.UserInvitations
                    .AnyAsync(i => i.InviterId == currentUserId && 
                                  i.InviteeId == invitee.Id && 
                                  i.InvitationType == "Najemca" && 
                                  i.Status == "Accepted");
                
                var alreadyTenantByCreation = invitee.CreatedByLandlordId == currentUserId;
                
                if (alreadyTenantByInvitation || alreadyTenantByCreation)
                {
                    return BadRequest("Ten użytkownik jest już Twoim najemcą");
                }
            }

            // Utwórz zaproszenie
            var invitation = new UserInvitation
            {
                Id = Guid.NewGuid(),
                InviterId = currentUserId,
                InviteeId = invitee.Id,
                InvitationType = request.InvitationType,
                Status = "Pending",
                Message = request.Message,
                CreatedAt = DateTime.UtcNow
            };

            _context.UserInvitations.Add(invitation);
            await _context.SaveChangesAsync();

            var inviter = await _userManager.FindByIdAsync(currentUserId.ToString());

            return Ok(new InvitationResponse
            {
                Id = invitation.Id,
                InviterId = invitation.InviterId,
                InviterName = $"{inviter.FirstName} {inviter.LastName}",
                InviterEmail = inviter.Email,
                InviteeId = invitation.InviteeId,
                InviteeName = $"{invitee.FirstName} {invitee.LastName}",
                InviteeEmail = invitee.Email,
                InvitationType = invitation.InvitationType,
                Status = invitation.Status,
                Message = invitation.Message,
                CreatedAt = invitation.CreatedAt
            });
        }

        /// <summary>
        /// Odpowiedz na zaproszenie (akceptuj lub odrzuć)
        /// </summary>
        [HttpPost("respond")]
        public async Task<IActionResult> RespondToInvitation([FromBody] RespondToInvitationRequest request)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var invitation = await _context.UserInvitations
                .Include(i => i.Inviter)
                .FirstOrDefaultAsync(i => i.Id == request.InvitationId);

            if (invitation == null)
            {
                return NotFound("Zaproszenie nie istnieje");
            }

            if (invitation.InviteeId != currentUserId)
            {
                return Forbid();
            }

            if (invitation.Status != "Pending")
            {
                return BadRequest("To zaproszenie zostało już rozpatrzone");
            }

            invitation.Status = request.Accept ? "Accepted" : "Rejected";
            invitation.RespondedAt = DateTime.UtcNow;

            if (request.Accept)
            {
                if (invitation.InvitationType == "Serwisant")
                {
                    // Dodaj relację LandlordServiceman
                    var existingRelation = await _context.LandlordServicemen
                        .FirstOrDefaultAsync(ls => ls.LandlordId == invitation.InviterId && ls.ServicemanId == currentUserId);

                    if (existingRelation == null)
                    {
                        _context.LandlordServicemen.Add(new LandlordServiceman
                        {
                            LandlordId = invitation.InviterId,
                            ServicemanId = currentUserId,
                            AssignedAt = DateTime.UtcNow
                        });
                    }
                }
                // Dla Najemcy - nie dodajemy automatycznie do PropertyTenant,
                // właściciel musi ręcznie przypisać do konkretnego mieszkania
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = request.Accept ? "Zaproszenie zaakceptowane" : "Zaproszenie odrzucone" });
        }

        /// <summary>
        /// Pobierz oczekujące zaproszenia dla aktualnego użytkownika
        /// </summary>
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingInvitations()
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var invitations = await _context.UserInvitations
                .Include(i => i.Inviter)
                .Include(i => i.Invitee)
                .Where(i => i.InviteeId == currentUserId && i.Status == "Pending")
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new InvitationResponse
                {
                    Id = i.Id,
                    InviterId = i.InviterId,
                    InviterName = i.Inviter.FirstName + " " + i.Inviter.LastName,
                    InviterEmail = i.Inviter.Email,
                    InviteeId = i.InviteeId,
                    InviteeName = i.Invitee.FirstName + " " + i.Invitee.LastName,
                    InviteeEmail = i.Invitee.Email,
                    InvitationType = i.InvitationType,
                    Status = i.Status,
                    Message = i.Message,
                    CreatedAt = i.CreatedAt,
                    RespondedAt = i.RespondedAt
                })
                .ToListAsync();

            return Ok(invitations);
        }

        /// <summary>
        /// Pobierz wysłane zaproszenia (dla właścicieli)
        /// </summary>
        [HttpGet("sent")]
        public async Task<IActionResult> GetSentInvitations()
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var invitations = await _context.UserInvitations
                .Include(i => i.Inviter)
                .Include(i => i.Invitee)
                .Where(i => i.InviterId == currentUserId)
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new InvitationResponse
                {
                    Id = i.Id,
                    InviterId = i.InviterId,
                    InviterName = i.Inviter.FirstName + " " + i.Inviter.LastName,
                    InviterEmail = i.Inviter.Email,
                    InviteeId = i.InviteeId,
                    InviteeName = i.Invitee.FirstName + " " + i.Invitee.LastName,
                    InviteeEmail = i.Invitee.Email,
                    InvitationType = i.InvitationType,
                    Status = i.Status,
                    Message = i.Message,
                    CreatedAt = i.CreatedAt,
                    RespondedAt = i.RespondedAt
                })
                .ToListAsync();

            return Ok(invitations);
        }

        /// <summary>
        /// Anuluj wysłane zaproszenie
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> CancelInvitation(Guid id)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var invitation = await _context.UserInvitations.FindAsync(id);

            if (invitation == null)
            {
                return NotFound();
            }

            if (invitation.InviterId != currentUserId)
            {
                return Forbid();
            }

            if (invitation.Status != "Pending")
            {
                return BadRequest("Nie można anulować rozpatrzonego zaproszenia");
            }

            _context.UserInvitations.Remove(invitation);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        /// <summary>
        /// Pobierz liczbę oczekujących zaproszeń
        /// </summary>
        [HttpGet("pending/count")]
        public async Task<IActionResult> GetPendingCount()
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var count = await _context.UserInvitations
                .CountAsync(i => i.InviteeId == currentUserId && i.Status == "Pending");

            return Ok(new { count });
        }
    }
}
