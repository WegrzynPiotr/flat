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
    public class MessagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MessagesController(AppDbContext context)
        {
            _context = context;
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

            return Ok(new MessageResponse
            {
                Id = message.Id,
                SenderId = senderId,
                SenderName = $"{sender.FirstName} {sender.LastName}",
                ReceiverId = request.ReceiverId,
                ReceiverName = $"{receiver.FirstName} {receiver.LastName}",
                Content = message.Content,
                IsRead = message.IsRead,
                SentAt = message.SentAt
            });
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
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;

            var contactIds = new List<Guid>();

            if (userRole == "Wynajmujący")
            {
                // Wynajmujący widzi: swoich najemców i serwisantów
                var tenantIds = await _context.PropertyTenants
                    .Where(pt => _context.Properties.Any(p => p.OwnerId == userId && p.Id == pt.PropertyId))
                    .Select(pt => pt.TenantId)
                    .Distinct()
                    .ToListAsync();

                var servicemanIds = await _context.LandlordServicemen
                    .Where(ls => ls.LandlordId == userId)
                    .Select(ls => ls.ServicemanId)
                    .ToListAsync();

                contactIds.AddRange(tenantIds);
                contactIds.AddRange(servicemanIds);
            }
            else if (userRole == "Najemca")
            {
                // Najemca widzi: swojego wynajmującego i serwisantów z otwartych zgłoszeń
                var landlordIds = await _context.PropertyTenants
                    .Where(pt => pt.TenantId == userId)
                    .Join(_context.Properties, pt => pt.PropertyId, p => p.Id, (pt, p) => p.OwnerId)
                    .Distinct()
                    .ToListAsync();

                var servicemanIds = await _context.Issues
                    .Where(i => i.ReportedById == userId)
                    .SelectMany(i => _context.IssueServicemen.Where(iss => iss.IssueId == i.Id).Select(iss => iss.ServicemanId))
                    .Distinct()
                    .ToListAsync();

                contactIds.AddRange(landlordIds);
                contactIds.AddRange(servicemanIds);
            }
            else if (userRole == "Serwisant")
            {
                // Serwisant widzi: wynajmujących i najemców z przypisanych zgłoszeń
                var landlordIds = await _context.LandlordServicemen
                    .Where(ls => ls.ServicemanId == userId)
                    .Select(ls => ls.LandlordId)
                    .ToListAsync();

                var tenantIds = await _context.IssueServicemen
                    .Where(iss => iss.ServicemanId == userId)
                    .Join(_context.Issues, iss => iss.IssueId, i => i.Id, (iss, i) => i.ReportedById)
                    .Distinct()
                    .ToListAsync();

                contactIds.AddRange(landlordIds);
                contactIds.AddRange(tenantIds);
            }

            contactIds = contactIds.Distinct().ToList();

            var contacts = new List<ConversationUserResponse>();
            foreach (var contactId in contactIds)
            {
                var user = await _context.Users.FindAsync(contactId);
                var role = await _context.UserRoles
                    .Where(ur => ur.UserId == contactId)
                    .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                    .FirstOrDefaultAsync();

                var unreadCount = await _context.Messages
                    .CountAsync(m => m.SenderId == contactId && m.ReceiverId == userId && !m.IsRead);

                contacts.Add(new ConversationUserResponse
                {
                    UserId = contactId,
                    Name = $"{user.FirstName} {user.LastName}",
                    Role = role,
                    UnreadCount = unreadCount
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
