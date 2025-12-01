using System;
using System.Collections.Generic;

namespace Core.Models
{
    public class User
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; } // "W³aœciciel", "Najemca", "Serwisant", "Administrator"
        public string PhoneNumber { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        // Relacje
        public ICollection<Property> OwnedProperties { get; set; }
        public ICollection<Issue> ReportedIssues { get; set; }
    }
}
