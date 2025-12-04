using System;
using System.Collections.Generic;

namespace Core.Models
{
    public class Issue
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Category { get; set; } // "Hydraulika", "Elektryka", "Ogrzewanie", etc.
        public string Priority { get; set; } // "Niska", "Średnia", "Wysoka", "Krytyczna"
        public string Status { get; set; } // "Nowe", "Przypisane", "WTrakcie", "Rozwiązane", "Zamknięte"
        public Guid PropertyId { get; set; }
        public Guid ReportedById { get; set; }
        public DateTime ReportedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public List<string> Photos { get; set; } = new List<string>();

        // Relacje
        public Property Property { get; set; }
        public User ReportedBy { get; set; }
        
        // Komentarze/wpisy (ticket system)
        public ICollection<IssueComment> Comments { get; set; }
        
        // Przypisani serwisanci (many-to-many)
        public ICollection<IssueServiceman> AssignedServicemen { get; set; }
    }
}
