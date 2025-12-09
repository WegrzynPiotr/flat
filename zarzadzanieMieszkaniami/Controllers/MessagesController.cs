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

            // 1. Moje mieszkania (jestem właścicielem)
            var ownedProperties = await _context.Properties
                .Where(p => p.OwnerId == userId)
                .ToListAsync();

            var ownedPropertyIds = ownedProperties.Select(p => p.Id).ToList();

            // Najemcy moich mieszkań
            var myTenants = await _context.PropertyTenants
                .Where(pt => ownedPropertyIds.Contains(pt.PropertyId))
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { pt.TenantId, p.Address })
                .ToListAsync();
            contactIds.AddRange(myTenants.Select(t => t.TenantId));

            // Moi serwisanci
            var myServicemen = await _context.LandlordServicemen
                .Where(ls => ls.LandlordId == userId)
                .Select(ls => ls.ServicemanId)
                .ToListAsync();
            contactIds.AddRange(myServicemen);

            // 2. Mieszkania które wynajmuję (jestem najemcą)
            var rentedProperties = await _context.PropertyTenants
                .Where(pt => pt.TenantId == userId)
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => p)
                .ToListAsync();

            // Właściciele mieszkań które wynajmuję
            contactIds.AddRange(rentedProperties.Select(p => p.OwnerId));

            // 3. Serwisanci z moich aktywnych zgłoszeń (jako najemca)
            var myActiveIssues = await _context.Issues
                .Where(i => i.ReportedById == userId && 
                           (i.Status == "Nowe" || i.Status == "Przypisane" || i.Status == "W trakcie"))
                .Include(i => i.Property)
                .ToListAsync();

            var servicemanIssueMap = await _context.IssueServicemen
                .Where(iss => myActiveIssues.Select(i => i.Id).Contains(iss.IssueId))
                .Join(_context.Issues.Include(i => i.Property), iss => iss.IssueId, i => i.Id, 
                    (iss, i) => new { iss.ServicemanId, i.Property.Address })
                .ToListAsync();
            contactIds.AddRange(servicemanIssueMap.Select(s => s.ServicemanId));

            // 4. Jeśli jestem serwisantem - właściciele i najemcy z przypisanych zgłoszeń
            var assignedIssues = await _context.IssueServicemen
                .Where(iss => iss.ServicemanId == userId)
                .Join(_context.Issues, iss => iss.IssueId, i => i.Id, (iss, i) => i)
                .Where(i => i.Status == "Przypisane" || i.Status == "W trakcie")
                .Include(i => i.Property)
                .ToListAsync();

            contactIds.AddRange(assignedIssues.Select(i => i.Property.OwnerId));
            contactIds.AddRange(assignedIssues.Select(i => i.ReportedById));

            // Moi właściciele (jeśli jestem serwisantem)
            var myLandlords = await _context.LandlordServicemen
                .Where(ls => ls.ServicemanId == userId)
                .Select(ls => ls.LandlordId)
                .ToListAsync();
            contactIds.AddRange(myLandlords);

            contactIds = contactIds.Distinct().Where(id => id != userId).ToList();

            var contacts = new List<ConversationUserResponse>();
            foreach (var contactId in contactIds)
            {
                var user = await _context.Users.FindAsync(contactId);
                if (user == null) continue;

                var unreadCount = await _context.Messages
                    .CountAsync(m => m.SenderId == contactId && m.ReceiverId == userId && !m.IsRead);

                var relations = new List<UserRelation>();

                // Relacja 1: Kontakt jest moim najemcą (ja jestem właścicielem, on wynajmuje ode mnie)
                var tenantRelations = myTenants
                    .Where(t => t.TenantId == contactId)
                    .Select(t => new UserRelation { Role = "Najemca", PropertyAddress = t.Address })
                    .ToList();
                relations.AddRange(tenantRelations);

                // Relacja 2: Kontakt jest moim właścicielem/wynajmującym (ja wynajmuję od niego)
                var landlordRelations = rentedProperties
                    .Where(p => p.OwnerId == contactId)
                    .Select(p => new UserRelation { Role = "Wynajmujący", PropertyAddress = p.Address })
                    .ToList();
                relations.AddRange(landlordRelations);

                // Relacja 3: Kontakt jest serwisantem przypisanym do mojego zgłoszenia
                var servicemanRelations = servicemanIssueMap
                    .Where(s => s.ServicemanId == contactId)
                    .Select(s => new UserRelation { Role = "Serwisant", PropertyAddress = s.Address })
                    .Distinct()
                    .ToList();
                relations.AddRange(servicemanRelations);

                // Relacja 4: Jestem serwisantem, kontakt jest właścicielem mieszkania ze zgłoszenia
                var ownerFromIssueRelations = assignedIssues
                    .Where(i => i.Property.OwnerId == contactId)
                    .Select(i => new UserRelation { Role = "Właściciel", PropertyAddress = i.Property.Address })
                    .GroupBy(r => r.PropertyAddress)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(ownerFromIssueRelations);

                // Relacja 5: Jestem serwisantem, kontakt jest najemcą który zgłosił usterkę
                var reporterFromIssueRelations = assignedIssues
                    .Where(i => i.ReportedById == contactId && i.Property.OwnerId != contactId)
                    .Select(i => new UserRelation { Role = "Najemca", PropertyAddress = i.Property.Address })
                    .GroupBy(r => r.PropertyAddress)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(reporterFromIssueRelations);

                // Relacja 6: Kontakt jest moim właścicielem (jestem jego serwisantem)
                if (myLandlords.Contains(contactId))
                {
                    // Jeśli nie ma jeszcze relacji właściciela, dodaj ogólną
                    if (!relations.Any(r => r.Role == "Właściciel"))
                    {
                        relations.Add(new UserRelation { Role = "Właściciel", PropertyAddress = null });
                    }
                }

                // Usuń duplikaty (ta sama rola + adres)
                relations = relations
                    .GroupBy(r => new { r.Role, r.PropertyAddress })
                    .Select(g => g.First())
                    .ToList();

                contacts.Add(new ConversationUserResponse
                {
                    UserId = contactId,
                    Name = $"{user.FirstName} {user.LastName}",
                    UnreadCount = unreadCount,
                    Relations = relations
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
