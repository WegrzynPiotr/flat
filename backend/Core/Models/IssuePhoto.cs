using System;

namespace Core.Models
{
    public class IssuePhoto
    {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public string Url { get; set; }
        public Guid UploadedById { get; set; }
        public DateTime UploadedAt { get; set; }

        // Relacje
        public Issue Issue { get; set; }
        public User UploadedBy { get; set; }
    }
}
