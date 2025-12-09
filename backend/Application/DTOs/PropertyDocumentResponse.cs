using System;

namespace Application.DTOs
{
    public class PropertyDocumentResponse
    {
        public Guid Id { get; set; }
        public Guid PropertyId { get; set; }
        public string DocumentType { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
        public Guid UploadedById { get; set; }
        public string UploadedByName { get; set; }
        public string Notes { get; set; }
        public int Version { get; set; }
    }

    public class PropertyDocumentVersionResponse
    {
        public Guid Id { get; set; }
        public int Version { get; set; }
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
        public Guid UploadedById { get; set; }
        public string UploadedByName { get; set; }
        public string Notes { get; set; }
        public bool IsLatest { get; set; }
    }
}
