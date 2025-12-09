using System;

namespace Core.Models
{
    public class Message
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public Guid ReceiverId { get; set; }
        public string Content { get; set; }
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; }

        // Relacje
        public User Sender { get; set; }
        public User Receiver { get; set; }
    }
}
