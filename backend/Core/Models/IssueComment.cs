using System;

namespace Core.Models
{
    public class IssueComment
    {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public Guid AuthorId { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Relacje
        public Issue Issue { get; set; }
        public User Author { get; set; }
    }
}
