using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using zarzadzanieMieszkaniami.Helpers;
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
                SenderName = TextHelper.CapitalizeName(sender.FirstName, sender.LastName),
                ReceiverId = request.ReceiverId,
                ReceiverName = TextHelper.CapitalizeName(receiver.FirstName, receiver.LastName),
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
                SenderName = TextHelper.CapitalizeName(m.Sender.FirstName, m.Sender.LastName),
                ReceiverId = m.ReceiverId,
                ReceiverName = TextHelper.CapitalizeName(m.Receiver.FirstName, m.Receiver.LastName),
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

            // Najemcy moich mieszkań - tylko AKTYWNI najemcy
            var now = DateTime.UtcNow;
            var myTenants = await _context.PropertyTenants
                .Where(pt => ownedPropertyIds.Contains(pt.PropertyId) &&
                            pt.StartDate <= now && 
                            (pt.EndDate == null || pt.EndDate >= now))
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
            // Pobierz wszystkie nieruchomości gdzie kiedykolwiek byłem najemcą
            var allRentedProperties = await _context.PropertyTenants
                .Where(pt => pt.TenantId == userId)
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { Property = p, pt.StartDate, pt.EndDate })
                .ToListAsync();
            
            // Wszystkie (aktywne + byłe) - dla właścicieli
            var rentedProperties = allRentedProperties.Select(r => r.Property).Distinct().ToList();
            
            // Aktywne najmy - do współlokatorów i usterek
            var activeRentedProperties = allRentedProperties
                .Where(r => r.StartDate <= now && (r.EndDate == null || r.EndDate >= now))
                .Select(r => r.Property)
                .Distinct()
                .ToList();
            var activeRentedPropertyIds = activeRentedProperties.Select(p => p.Id).ToList();
            
            // Właściciele WSZYSTKICH mieszkań które kiedykolwiek wynajmowałem - zawsze w kontaktach
            contactIds.AddRange(rentedProperties.Select(p => p.OwnerId));

            // 2b. Współlokatorzy - inni AKTYWNI najemcy mieszkań które AKTYWNIE wynajmuję
            var coTenants = await _context.PropertyTenants
                .Where(pt => activeRentedPropertyIds.Contains(pt.PropertyId) && 
                            pt.TenantId != userId &&
                            pt.StartDate <= now && 
                            (pt.EndDate == null || pt.EndDate >= now))
                .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { pt.TenantId, p.Address })
                .Distinct()
                .ToListAsync();
            contactIds.AddRange(coTenants.Select(t => t.TenantId));

            // 3. Usterki - tylko te które SAM zgłosiłem lub z mieszkań które AKTYWNIE wynajmuję/posiadam
            var myActiveIssues = await _context.Issues
                .Where(i => (i.ReportedById == userId || 
                            ownedPropertyIds.Contains(i.PropertyId) ||
                            activeRentedPropertyIds.Contains(i.PropertyId)) && 
                           i.Status != "Rozwiązane")
                .Include(i => i.Property)
                .ToListAsync();

            var myActiveIssueIds = myActiveIssues.Select(i => i.Id).ToList();

            // Serwisanci przypisani do moich usterek z nazwą usterki
            var servicemanIssueMap = await _context.IssueServicemen
                .Where(iss => myActiveIssueIds.Contains(iss.IssueId))
                .ToListAsync();
            
            // Pobierz tytuły usterek
            var servicemanWithIssueTitle = servicemanIssueMap
                .Select(iss => new { 
                    iss.ServicemanId, 
                    IssueTitle = myActiveIssues.FirstOrDefault(i => i.Id == iss.IssueId)?.Title 
                })
                .ToList();
            
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

            // 4a2. Najemcy mieszkań z aktywnych usterek (dla serwisanta)
            var assignedIssuePropertyIds = assignedIssues.Select(i => i.PropertyId).Distinct().ToList();
            var tenantsFromAssignedIssues = await _context.PropertyTenants
                .Where(pt => assignedIssuePropertyIds.Contains(pt.PropertyId) &&
                            pt.StartDate <= now &&
                            (pt.EndDate == null || pt.EndDate >= now))
                .Select(pt => new { pt.TenantId, pt.PropertyId })
                .ToListAsync();
            contactIds.AddRange(tenantsFromAssignedIssues.Select(t => t.TenantId));

            // 4b. Właściciele z oczekujących lub zaakceptowanych zaproszeń do naprawy (ServiceRequest)
            var serviceRequestLandlords = await _context.ServiceRequests
                .Where(sr => sr.ServicemanId == userId && 
                            (sr.Status == "Oczekujące" || sr.Status == "Zaakceptowane"))
                .Select(sr => new { sr.LandlordId, sr.Issue.Property.Address, sr.Status, IssueTitle = sr.Issue.Title })
                .ToListAsync();
            contactIds.AddRange(serviceRequestLandlords.Select(sr => sr.LandlordId));

            // Moi właściciele (jeśli jestem serwisantem) - tylko ci z aktywnymi usterkami
            var myLandlords = await _context.LandlordServicemen
                .Where(ls => ls.ServicemanId == userId)
                .Select(ls => ls.LandlordId)
                .ToListAsync();
            // Dodaj tylko tych właścicieli, którzy mają aktywne usterki przypisane do mnie
            var landlordsWithActiveIssues = assignedIssues
                .Select(i => i.Property.OwnerId)
                .Distinct()
                .ToList();
            contactIds.AddRange(myLandlords.Where(l => landlordsWithActiveIssues.Contains(l)));

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
                    .Select(t => new UserRelation { Role = "Najemca", Details = TextHelper.Capitalize(t.Address) })
                    .ToList();
                relations.AddRange(tenantRelations);

                // Relacja 1b: Kontakt jest AKTYWNYM najemcą w mieszkaniu gdzie ja też jestem AKTYWNYM najemcą (współlokatorzy)
                // Znajdź wszystkie mieszkania gdzie kontakt jest aktywnym najemcą
                var contactTenantProperties = await _context.PropertyTenants
                    .Where(pt => pt.TenantId == contactId &&
                                pt.StartDate <= now && 
                                (pt.EndDate == null || pt.EndDate >= now))
                    .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => new { p.Id, p.Address, p.OwnerId })
                    .ToListAsync();
                
                // Dla każdego mieszkania gdzie kontakt jest aktywnym najemcą, sprawdź czy ja też jestem aktywnym najemcą
                foreach (var prop in contactTenantProperties)
                {
                    // Jeśli ja jestem aktywnym najemcą tego samego mieszkania (współlokator)
                    var amITenantThere = await _context.PropertyTenants
                        .AnyAsync(pt => pt.PropertyId == prop.Id && 
                                       pt.TenantId == userId &&
                                       pt.StartDate <= now && 
                                       (pt.EndDate == null || pt.EndDate >= now));
                    
                    if (amITenantThere && !relations.Any(r => r.Details == TextHelper.Capitalize(prop.Address)))
                    {
                        relations.Add(new UserRelation { Role = "Najemca", Details = TextHelper.Capitalize(prop.Address) });
                    }
                }

                // Relacja 2: Kontakt jest moim właścicielem/wynajmującym (ja wynajmuję lub wynajmowałem od niego)
                var landlordRelations = rentedProperties
                    .Where(p => p.OwnerId == contactId)
                    .Select(p => new UserRelation { Role = "Wynajmujący", Details = TextHelper.Capitalize(p.Address) })
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
                // Pokazuj jako "Usterka" z nazwą usterki, nie jako "Wynajmujący"
                var ownerFromIssueRelations = assignedIssues
                    .Where(i => i.Property.OwnerId == contactId)
                    .Select(i => new UserRelation { Role = "Usterka", Details = TextHelper.Capitalize(i.Title) })
                    .GroupBy(r => r.Details)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(ownerFromIssueRelations);

                // Relacja 5: Jestem serwisantem, kontakt jest najemcą który zgłosił usterkę
                var reporterFromIssueRelations = assignedIssues
                    .Where(i => i.ReportedById == contactId && i.Property.OwnerId != contactId)
                    .Select(i => new UserRelation { Role = "Najemca", Details = TextHelper.Capitalize(i.Property.Address) })
                    .GroupBy(r => r.Details)
                    .Select(g => g.First())
                    .ToList();
                relations.AddRange(reporterFromIssueRelations);

                // Relacja 5b: Jestem serwisantem, kontakt jest najemcą mieszkania z usterką (nie musi być zgłaszającym)
                var tenantFromIssueRelations = tenantsFromAssignedIssues
                    .Where(t => t.TenantId == contactId)
                    .Select(t => {
                        var issue = assignedIssues.FirstOrDefault(i => i.PropertyId == t.PropertyId);
                        return new UserRelation { 
                            Role = "Najemca", 
                            Details = issue != null ? TextHelper.Capitalize(issue.Property.Address) : null 
                        };
                    })
                    .Where(r => r.Details != null)
                    .GroupBy(r => r.Details)
                    .Select(g => g.First())
                    .ToList();
                // Dodaj tylko te, które jeszcze nie istnieją
                foreach (var rel in tenantFromIssueRelations)
                {
                    if (!relations.Any(r => r.Role == rel.Role && r.Details == rel.Details))
                    {
                        relations.Add(rel);
                    }
                }

                // Relacja 6: Kontakt jest moim właścicielem (jestem jego serwisantem)
                // Pokazuj tylko jeśli mam aktywne usterki przypisane w jego nieruchomościach
                // Dla serwisanta pokazuj jako "Właściciel" a nie "Wynajmujący"
                if (myLandlords.Contains(contactId) && landlordsWithActiveIssues.Contains(contactId))
                {
                    // Pobierz nazwy usterek tego właściciela
                    var landlordIssues = assignedIssues
                        .Where(i => i.Property.OwnerId == contactId)
                        .Select(i => TextHelper.Capitalize(i.Title))
                        .Distinct()
                        .ToList();
                    
                    foreach (var issueTitle in landlordIssues)
                    {
                        // Dodaj tylko jeśli nie ma jeszcze takiej relacji
                        if (!relations.Any(r => r.Role == "Usterka" && r.Details == issueTitle))
                        {
                            relations.Add(new UserRelation { Role = "Usterka", Details = issueTitle });
                        }
                    }
                }

                // Relacja 7: Kontakt jest właścicielem który wysłał zaproszenie do naprawy (ServiceRequest)
                var serviceRequestRelationsForContact = serviceRequestLandlords
                    .Where(sr => sr.LandlordId == contactId)
                    .Select(sr => new UserRelation 
                    { 
                        Role = sr.Status == "Oczekujące" ? "Zaproszenie do naprawy" : "Usterka", 
                        Details = TextHelper.Capitalize(sr.IssueTitle)
                    })
                    .ToList();
                relations.AddRange(serviceRequestRelationsForContact);

                // Usuń duplikaty (ta sama rola + details)
                relations = relations
                    .GroupBy(r => new { r.Role, r.Details })
                    .Select(g => g.First())
                    .ToList();

                // Sortuj relacje w określonej kolejności: Wynajmujący, Najemca, Usterka, Zaproszenie do naprawy, Serwisant
                var roleOrder = new Dictionary<string, int>
                {
                    { "Wynajmujący", 1 },
                    { "Najemca", 2 },
                    { "Usterka", 3 },
                    { "Zaproszenie do naprawy", 4 },
                    { "Serwisant", 5 }
                };
                relations = relations
                    .OrderBy(r => roleOrder.TryGetValue(r.Role, out var order) ? order : 100)
                    .ThenBy(r => r.Details)
                    .ToList();

                contacts.Add(new ConversationUserResponse
                {
                    UserId = contactId,
                    Name = TextHelper.CapitalizeName(user.FirstName, user.LastName),
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
