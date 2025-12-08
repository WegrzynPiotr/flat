namespace Application.DTOs
{
    public class IssueResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Priority { get; set; }
        public string Status { get; set; }
        public Guid PropertyId { get; set; }
        public string PropertyAddress { get; set; }
        public Guid ReportedById { get; set; }
        public string ReportedByName { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public List<string> Photos { get; set; } = new();
    }
}
