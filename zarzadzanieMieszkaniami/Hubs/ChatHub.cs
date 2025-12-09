using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;

namespace zarzadzanieMieszkaniami.Hubs
{
    [Authorize]
    public class ChatHub : Hub
    {
        private static readonly ConcurrentDictionary<string, string> _userConnections = new();

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId != null)
            {
                _userConnections.AddOrUpdate(userId, Context.ConnectionId, (key, oldValue) => Context.ConnectionId);
                Console.WriteLine($"🟢 User {userId} connected with connection {Context.ConnectionId}");
            }
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId != null)
            {
                _userConnections.TryRemove(userId, out _);
                Console.WriteLine($"🔴 User {userId} disconnected");
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task SendMessage(string receiverId, string content)
        {
            var senderId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            Console.WriteLine($"📨 Message from {senderId} to {receiverId}: {content}");

            // Wyślij wiadomość do odbiorcy jeśli jest online
            if (_userConnections.TryGetValue(receiverId, out var connectionId))
            {
                await Clients.Client(connectionId).SendAsync("ReceiveMessage", new
                {
                    SenderId = senderId,
                    Content = content,
                    SentAt = DateTime.UtcNow
                });
                Console.WriteLine($"✅ Message delivered to {receiverId}");
            }
            else
            {
                Console.WriteLine($"⚠️ User {receiverId} is offline");
            }

            // Zawsze potwierdź nadawcy
            await Clients.Caller.SendAsync("MessageSent", new
            {
                ReceiverId = receiverId,
                Content = content,
                SentAt = DateTime.UtcNow
            });
        }

        public static string? GetConnectionId(string userId)
        {
            _userConnections.TryGetValue(userId, out var connectionId);
            return connectionId;
        }
    }
}
