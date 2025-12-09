using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using zarzadzanieMieszkaniami.Hubs;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public MessagesController(AppDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageRequest request)
        {
            var senderId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var message = new Message
            {
                Id = Guid.NewGuid(),
                SenderId = senderId,
                ReceiverId = request.ReceiverId,
                Content = request.Content,
                IsRead = false,
                SentAt = DateTime.UtcNow
            };

            _context.Messages.Add(message);
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(senderId);
            var receiver = await _context.Users.FindAsync(request.ReceiverId);

            var response = new MessageResponse
            {
                Id = message.Id,
                SenderId = senderId,
                SenderName = $"{sender.FirstName} {sender.LastName}",
                ReceiverId = request.ReceiverId,
                ReceiverName = $"{receiver.FirstName} {receiver.LastName}",
                Content = message.Content,
                IsRead = message.IsRead,
                SentAt = message.SentAt
            };

            // Wyślij powiadomienie przez SignalR jeśli odbiorca jest online
            var connectionId = ChatHub.GetConnectionId(request.ReceiverId.ToString());
            if (connectionId != null)
            {
                await _hubContext.Clients.Client(connectionId).SendAsync("ReceiveMessage", response);
                Console.WriteLine($"📨 Real-time message sent to {receiver.FirstName} {receiver.LastName}");
            }

            return Ok(response);
        }

        [HttpGet("conversation/{userId}")]
        [Authorize]
        public async Task<IActionResult> GetConversation(Guid userId)
        {
            var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var messages = await _context.Messages
                .Where(m => (m.SenderId == currentUserId && m.ReceiverId == userId) ||
                           (m.SenderId == userId && m.ReceiverId == currentUserId))
                .Include(m => m.Sender)
                .Include(m => m.Receiver)
                .OrderBy(m => m.SentAt)
                .ToListAsync();

            var responses = messages.Select(m => new MessageResponse
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = $"{m.Sender.FirstName} {m.Sender.LastName}",
                ReceiverId = m.ReceiverId,
                ReceiverName = $"{m.Receiver.FirstName} {m.Receiver.LastName}",
                Content = m.Content,
                IsRead = m.IsRead,
                SentAt = m.SentAt
            }).ToList();

            return Ok(responses);
        }

        [HttpGet("contacts")]
        [Authorize]
        public async Task<IActionResult> GetContacts()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var contactIds = new List<Guid>();

            // 1. Jeśli użytkownik jest właścicielem - jego najemcy i serwisanci (zaakceptowani przez zaproszenia)
            var ownedProperties = await _context.Properties
                .Where(p => p.OwnerId == userId)
                .Select(p => p.Id)
                .ToListAsync();

            if (ownedProperties.Any())
            {
                // Najemcy przypisani do moich mieszkań
                var tenantIds = await _context.PropertyTenants
                    .Where(pt => ownedProperties.Contains(pt.PropertyId))
                    .Select(pt => pt.TenantId)
                    .Distinct()
                    .ToListAsync();
                contactIds.AddRange(tenantIds);

                // Moi serwisanci (z relacji LandlordServiceman)
                var servicemanIds = await _context.LandlordServicemen
                    .Where(ls => ls.LandlordId == userId)
                    .Select(ls => ls.ServicemanId)
                    .ToListAsync();
                contactIds.AddRange(servicemanIds);

                // Użytkownicy z zaakceptowanych zaproszeń (najemcy i serwisanci)
                var acceptedInviteeIds = await _context.UserInvitations
                    .Where(i => i.InviterId == userId && i.Status == "Accepted")
                    .Select(i => i.InviteeId)
                    .ToListAsync();
                contactIds.AddRange(acceptedInviteeIds);
            }

            // 2. Jeśli użytkownik wynajmuje mieszkanie - właściciel tego mieszkania
            var rentedProperties = await _context.PropertyTenants
                .Where(pt => pt.TenantId == userId)
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => p)
                .ToListAsync();

            if (rentedProperties.Any())
            {
                // Właściciele mieszkań, które wynajmuję
                var landlordIds = rentedProperties.Select(p => p.OwnerId).Distinct().ToList();
                contactIds.AddRange(landlordIds);

                // Serwisanci przypisani do moich aktywnych usterek
                var activeIssueServicemen = await _context.Issues
                    .Where(i => i.ReportedById == userId && 
                               (i.Status == "Nowe" || i.Status == "Przypisane" || i.Status == "W trakcie"))
                    .SelectMany(i => _context.IssueServicemen
                        .Where(iss => iss.IssueId == i.Id)
                        .Select(iss => iss.ServicemanId))
                    .Distinct()
                    .ToListAsync();
                contactIds.AddRange(activeIssueServicemen);
            }

            // 3. Jeśli użytkownik jest serwisantem - właściciele i najemcy z przypisanych zgłoszeń
            var assignedIssues = await _context.IssueServicemen
                .Where(iss => iss.ServicemanId == userId)
                .Join(_context.Issues, iss => iss.IssueId, i => i.Id, (iss, i) => i)
                .Where(i => i.Status == "Przypisane" || i.Status == "W trakcie")
                .Include(i => i.Property)
                .ToListAsync();

            if (assignedIssues.Any())
            {
                // Właściciele mieszkań z przypisanych zgłoszeń
                var landlordIdsFromIssues = assignedIssues.Select(i => i.Property.OwnerId).Distinct().ToList();
                contactIds.AddRange(landlordIdsFromIssues);

                // Najemcy którzy zgłosili usterki
                var reporterIds = assignedIssues.Select(i => i.ReportedById).Distinct().ToList();
                contactIds.AddRange(reporterIds);
            }

            // Moi właściciele (jeśli jestem serwisantem)
            var myLandlords = await _context.LandlordServicemen
                .Where(ls => ls.ServicemanId == userId)
                .Select(ls => ls.LandlordId)
                .ToListAsync();
            contactIds.AddRange(myLandlords);

            // Właściciele którzy mnie zaprosili (zaakceptowane zaproszenia)
            var invitersWhoInvitedMe = await _context.UserInvitations
                .Where(i => i.InviteeId == userId && i.Status == "Accepted")
                .Select(i => i.InviterId)
                .ToListAsync();
            contactIds.AddRange(invitersWhoInvitedMe);

            contactIds = contactIds.Distinct().Where(id => id != userId).ToList();

            var contacts = new List<ConversationUserResponse>();
            foreach (var contactId in contactIds)
            {
                var user = await _context.Users.FindAsync(contactId);
                if (user == null) continue;

                var role = await _context.UserRoles
                    .Where(ur => ur.UserId == contactId)
                    .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                    .FirstOrDefaultAsync();

                var unreadCount = await _context.Messages
                    .CountAsync(m => m.SenderId == contactId && m.ReceiverId == userId && !m.IsRead);

                // Pobierz adres mieszkania powiązanego z kontaktem
                string propertyAddress = null;
                
                // Dla najemcy - pobierz adres mieszkania, które wynajmuje (od aktualnego użytkownika)
                if (ownedProperties.Any())
                {
                    propertyAddress = await _context.PropertyTenants
                        .Where(pt => pt.TenantId == contactId && ownedProperties.Contains(pt.PropertyId))
                        .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => p.Address)
                        .FirstOrDefaultAsync();
                }

                contacts.Add(new ConversationUserResponse
                {
                    UserId = contactId,
                    Name = $"{user.FirstName} {user.LastName}",
                    Role = role,
                    UnreadCount = unreadCount,
                    PropertyAddress = propertyAddress
                });
            }

            return Ok(contacts);
        }

        [HttpPut("{messageId}/mark-read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(Guid messageId)
        {
            var message = await _context.Messages.FindAsync(messageId);
            if (message == null)
                return NotFound();

            message.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok();
        }
    }
}
