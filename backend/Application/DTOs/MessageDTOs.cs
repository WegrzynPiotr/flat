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
        public string Role { get; set; }
        public int UnreadCount { get; set; }
        public string PropertyAddress { get; set; }
    }
}
