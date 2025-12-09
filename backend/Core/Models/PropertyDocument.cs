using System;

namespace Core.Models
{
    public class PropertyDocument
    {
        public Guid Id { get; set; }
        public Guid PropertyId { get; set; }
        public string DocumentType { get; set; } // Umowa, Wodomierz, Prąd, Gaz, Ogrzewanie, Ubezpieczenie, Remont, Inne
        public string FileName { get; set; }
        public string FileUrl { get; set; }
        public DateTime UploadedAt { get; set; }
        public Guid UploadedById { get; set; }
        public string Notes { get; set; }
        public int Version { get; set; } // Wersja dokumentu (1, 2, 3, ...)
        public bool IsLatest { get; set; } // Czy to najnowsza wersja

        // Relacje
        public Property Property { get; set; }
        public User UploadedBy { get; set; }
    }
}
