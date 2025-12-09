namespace Application.DTOs
{
    public class TenantInfo
    {
        public Guid TenantId { get; set; }
        public string TenantName { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class PropertyDocumentInfo
    {
        public string Filename { get; set; }
        public string OriginalName { get; set; }
        public DateTime UploadedAt { get; set; }
        public string Url { get; set; }
    }

    public class PropertyResponse
    {
        public Guid Id { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public int RoomsCount { get; set; }
        public decimal Area { get; set; }
        public string? Description { get; set; }
        public Guid OwnerId { get; set; }
        public List<string> Photos { get; set; } = new List<string>();
        public List<PropertyDocumentInfo> Documents { get; set; } = new List<PropertyDocumentInfo>();
        public List<TenantInfo> Tenants { get; set; } = new List<TenantInfo>();
        public DateTime CreatedAt { get; set; }
        public bool IsActiveTenant { get; set; } // Czy aktualny użytkownik ma aktywny najem
    }
}
