
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
        public Guid OwnerId { get; set; }
        
        // Usunięte: CurrentTenantId - teraz many-to-many przez PropertyTenant
        public DateTime CreatedAt { get; set; }

        // Relacje
        public User Owner { get; set; }
        
        // Najemcy - many-to-many przez PropertyTenant
        public ICollection<PropertyTenant> Tenants { get; set; }
        
        public ICollection<Issue> Issues { get; set; }
    }
}
