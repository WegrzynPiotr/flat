
using System;
using System.Collections.Generic;

namespace Core.Models
{
    public class Property
    {
        public Guid Id { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public int RoomsCount { get; set; }
        public decimal Area { get; set; }
        public string? Description { get; set; }
        public Guid OwnerId { get; set; }
        
        // Zdjęcia przechowywane jako JSON array stringów (URLs)
        public string Photos { get; set; } // JSON: ["photo1.jpg", "photo2.jpg"]
        
        // Dokumenty przechowywane jako JSON array obiektów {filename, originalName, uploadedAt}
        public string? Documents { get; set; } // JSON: [{"filename":"doc1.pdf","originalName":"Umowa.pdf","uploadedAt":"2025-01-01"}]
        
        // Usunięte: CurrentTenantId - teraz many-to-many przez PropertyTenant
        public DateTime CreatedAt { get; set; }

        // Relacje
        public User Owner { get; set; }
        
        // Najemcy - many-to-many przez PropertyTenant
        public ICollection<PropertyTenant> Tenants { get; set; }
        
        public ICollection<Issue> Issues { get; set; }
        public ICollection<PropertyDocument> PropertyDocuments { get; set; }
    }
}
