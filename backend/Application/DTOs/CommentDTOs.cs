namespace Application.DTOs
{
    public class CreateCommentRequest
    {
        public Guid IssueId { get; set; }
        public string Content { get; set; }
    }

    public class CommentResponse
    {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public Guid AuthorId { get; set; }
        public string AuthorName { get; set; }
        public string AuthorRole { get; set; }
        public string Content { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
