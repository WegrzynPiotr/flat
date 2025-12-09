namespace Application.DTOs
{
    public class SendInvitationRequest
    {
        public string Email { get; set; }
        public string InvitationType { get; set; } // "Najemca" lub "Serwisant"
        public string? Message { get; set; }
    }

    public class RespondToInvitationRequest
    {
        public Guid InvitationId { get; set; }
        public bool Accept { get; set; }
    }

    public class InvitationResponse
    {
        public Guid Id { get; set; }
        public Guid InviterId { get; set; }
        public string InviterName { get; set; }
        public string InviterEmail { get; set; }
        public Guid InviteeId { get; set; }
        public string InviteeName { get; set; }
        public string InviteeEmail { get; set; }
        public string InvitationType { get; set; }
        public string Status { get; set; }
        public string? Message { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
    }
}
