namespace Application.DTOs
{
    public class SendMessageRequest
    {
        public Guid ReceiverId { get; set; }
        public string Content { get; set; }
    }

    public class MessageResponse
    {
        public Guid Id { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; }
        public Guid ReceiverId { get; set; }
        public string ReceiverName { get; set; }
        public string Content { get; set; }
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; }
    }

    public class ConversationUserResponse
    {
        public Guid UserId { get; set; }
        public string Name { get; set; }
        public int UnreadCount { get; set; }
        public List<UserRelation> Relations { get; set; } = new List<UserRelation>();
    }

    public class UserRelation
    {
        public string Role { get; set; } // "Właściciel", "Najemca", "Serwisant", "Wynajmujący"
        public string Details { get; set; } // Adres mieszkania lub nazwa usterki dla serwisanta
    }
}
