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

        // Tymczasowy endpoint diagnostyczny
        [HttpGet("debug-issues")]
        [Authorize]
        public async Task<IActionResult> DebugIssues()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var ownedProperties = await _context.Properties
                .Where(p => p.OwnerId == userId)
                .Select(p => new { p.Id, p.Address })
                .ToListAsync();

            var ownedPropertyIds = ownedProperties.Select(p => p.Id).ToList();

            // Wszystkie usterki z moich nieruchomości (bez filtra statusu)
            var allIssues = await _context.Issues
                .Where(i => ownedPropertyIds.Contains(i.PropertyId))
                .Select(i => new { i.Id, i.Title, i.Status, i.PropertyId })
                .ToListAsync();

            // Aktywne usterki
            var activeIssues = allIssues
                .Where(i => i.Status == "Nowe" || i.Status == "Przypisane" || i.Status == "W trakcie")
                .ToList();

            var allIssueIds = allIssues.Select(i => i.Id).ToList();
            
            var issueServicemen = await _context.IssueServicemen
                .Where(iss => allIssueIds.Contains(iss.IssueId))
                .Join(_context.Users, iss => iss.ServicemanId, u => u.Id, 
                    (iss, u) => new { iss.IssueId, iss.ServicemanId, ServicemanName = u.FirstName + " " + u.LastName })
                .ToListAsync();

            return Ok(new { 
                UserId = userId,
                OwnedProperties = ownedProperties,
                AllIssues = allIssues,
                ActiveIssues = activeIssues, 
                IssueServicemen = issueServicemen 
            });
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

            // Najemcy moich mieszkań - pobierz unikalne kombinacje (najemca, mieszkanie)
            var myTenants = await _context.PropertyTenants
                .Where(pt => ownedPropertyIds.Contains(pt.PropertyId))
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { pt.TenantId, p.Address })
                .Distinct()
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
            var rentedPropertyIds = rentedProperties.Select(p => p.Id).ToList();

            // Właściciele mieszkań które wynajmuję
            contactIds.AddRange(rentedProperties.Select(p => p.OwnerId));

            // 3. Usterki z moich mieszkań (jako najemca lub właściciel) - wszystkie poza "Rozwiązane"
            var myActiveIssues = await _context.Issues
                .Where(i => (i.ReportedById == userId || ownedPropertyIds.Contains(i.PropertyId)) && 
                           i.Status != "Rozwiązane")
                .Include(i => i.Property)
                .ToListAsync();

            Console.WriteLine($"🔍 User {userId} has {myActiveIssues.Count} active issues");
            foreach (var issue in myActiveIssues)
            {
                Console.WriteLine($"   Issue: {issue.Id} - {issue.Title} - Status: {issue.Status}");
            }

            var myActiveIssueIds = myActiveIssues.Select(i => i.Id).ToList();

            // Serwisanci przypisani do moich usterek z nazwą usterki
            var servicemanIssueMap = await _context.IssueServicemen
                .Where(iss => myActiveIssueIds.Contains(iss.IssueId))
                .ToListAsync();
            
            Console.WriteLine($"🔧 Found {servicemanIssueMap.Count} serviceman assignments");
            foreach (var iss in servicemanIssueMap)
            {
                Console.WriteLine($"   IssueId: {iss.IssueId} - ServicemanId: {iss.ServicemanId}");
            }
            
            // Pobierz tytuły usterek
            var servicemanWithIssueTitle = servicemanIssueMap
                .Select(iss => new { 
                    iss.ServicemanId, 
                    IssueTitle = myActiveIssues.FirstOrDefault(i => i.Id == iss.IssueId)?.Title 
                })
                .ToList();
            
            Console.WriteLine($"📋 Serviceman with titles: {servicemanWithIssueTitle.Count}");
            foreach (var s in servicemanWithIssueTitle)
            {
                Console.WriteLine($"   ServicemanId: {s.ServicemanId} - Title: {s.IssueTitle}");
            }
            
            contactIds.AddRange(servicemanWithIssueTitle.Select(s => s.ServicemanId));

            // 4. Jeśli jestem serwisantem - właściciele i najemcy z przypisanych zgłoszeń (poza rozwiązanymi)
            var assignedIssues = await _context.IssueServicemen
                .Where(iss => iss.ServicemanId == userId)
                .Join(_context.Issues, iss => iss.IssueId, i => i.Id, (iss, i) => i)
                .Where(i => i.Status != "Rozwiązane")
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
                    .Select(t => new UserRelation { Role = "Najemca", Details = t.Address })
                    .ToList();
                relations.AddRange(tenantRelations);

                // Relacja 1b: Kontakt jest najemcą w mieszkaniu gdzie ja też jestem najemcą (współlokatorzy)
                // Znajdź wszystkie mieszkania gdzie kontakt jest najemcą
                var contactTenantProperties = await _context.PropertyTenants
                    .Where(pt => pt.TenantId == contactId)
                    .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { p.Id, p.Address, p.OwnerId })
                    .ToListAsync();
                
                // Dla każdego mieszkania gdzie kontakt jest najemcą, sprawdź czy ja też mam z nim relację
                foreach (var prop in contactTenantProperties)
                {
                    // Jeśli ja jestem najemcą tego samego mieszkania (współlokator)
                    var amITenantThere = await _context.PropertyTenants
                        .AnyAsync(pt => pt.PropertyId == prop.Id && pt.TenantId == userId);
                    
                    if (amITenantThere && !relations.Any(r => r.Details == prop.Address))
                    {
                        relations.Add(new UserRelation { Role = "Najemca", Details = prop.Address });
                    }
                }

                // Relacja 2: Kontakt jest moim właścicielem/wynajmującym (ja wynajmuję od niego)
                var landlordRelations = rentedProperties
                    .Where(p => p.OwnerId == contactId)
                    .Select(p => new UserRelation { Role = "Wynajmujący", Details = p.Address })
                    .ToList();
                relations.AddRange(landlordRelations);

                // Relacja 3: Kontakt jest serwisantem przypisanym do mojego zgłoszenia (pokazuj nazwę usterki)
                var servicemanRelations = servicemanWithIssueTitle
                    .Where(s => s.ServicemanId == contactId)
                    .Select(s => new UserRelation { Role = "Serwisant", Details = s.IssueTitle })
                    .ToList();
                relations.AddRange(servicemanRelations);

                // Relacja 3b: Kontakt jest moim serwisantem (z LandlordServicemen - ja jestem właścicielem) - bez aktywnych usterek
                if (myServicemen.Contains(contactId) && !servicemanRelations.Any())
                {
                    relations.Add(new UserRelation { Role = "Serwisant", Details = null });
                }

                // Relacja 4: Jestem serwisantem, kontakt jest właścicielem mieszkania ze zgłoszenia
                var ownerFromIssueRelations = assignedIssues
                    .Where(i => i.Property.OwnerId == contactId)
                    .Select(i => new UserRelation { Role = "Właściciel", Details = i.Property.Address })
                    .GroupBy(r => r.Details)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(ownerFromIssueRelations);

                // Relacja 5: Jestem serwisantem, kontakt jest najemcą który zgłosił usterkę
                var reporterFromIssueRelations = assignedIssues
                    .Where(i => i.ReportedById == contactId && i.Property.OwnerId != contactId)
                    .Select(i => new UserRelation { Role = "Najemca", Details = i.Property.Address })
                    .GroupBy(r => r.Details)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(reporterFromIssueRelations);

                // Relacja 6: Kontakt jest moim właścicielem (jestem jego serwisantem)
                if (myLandlords.Contains(contactId))
                {
                    // Jeśli nie ma jeszcze relacji właściciela, dodaj ogólną
                    if (!relations.Any(r => r.Role == "Właściciel"))
                    {
                        relations.Add(new UserRelation { Role = "Właściciel", Details = null });
                    }
                }

                // Usuń duplikaty (ta sama rola + details)
                relations = relations
                    .GroupBy(r => new { r.Role, r.Details })
                    .Select(g => g.First())
                    .ToList();

                // Usuń "Właściciel" jeśli dla tego samego adresu jest "Wynajmujący"
                // (z perspektywy najemcy preferuj "Wynajmujący" nad "Właściciel")
                var landlordAddresses = relations
                    .Where(r => r.Role == "Wynajmujący" && r.Details != null)
                    .Select(r => r.Details)
                    .ToHashSet();
                
                relations = relations
                    .Where(r => !(r.Role == "Właściciel" && r.Details != null && landlordAddresses.Contains(r.Details)))
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
