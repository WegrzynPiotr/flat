namespace Application.DTOs
{
    public class ServicemanInfo
    {
        public Guid ServicemanId { get; set; }
        public string ServicemanName { get; set; }
        public DateTime AssignedAt { get; set; }
    }

    public class PhotoInfo
    {
        public Guid Id { get; set; }
        public string Url { get; set; }
        public Guid UploadedById { get; set; }
        public string UploadedByName { get; set; }
        public DateTime UploadedAt { get; set; }
    }

    public class PropertyInfo
    {
        public Guid Id { get; set; }
        public string Address { get; set; }
        public Guid OwnerId { get; set; }
    }

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
        public PropertyInfo? Property { get; set; }
        public Guid ReportedById { get; set; }
        public string ReportedByName { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public List<string> Photos { get; set; } = new(); // Legacy - zachowane dla kompatybilności
        public List<PhotoInfo> PhotosWithMetadata { get; set; } = new();
        public List<ServicemanInfo> AssignedServicemen { get; set; } = new();
        public List<CommentResponse> Comments { get; set; } = new();
    }
}
