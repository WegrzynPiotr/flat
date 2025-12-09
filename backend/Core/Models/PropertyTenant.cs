using System;

namespace Core.Models
{
    // Relacja many-to-many: Property <-> Tenant
    // Pozwala na przypisanie wielu najemców do jednego mieszkania
    public class PropertyTenant
    {
        public Guid PropertyId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // Relacje
        public Property Property { get; set; }
        public User Tenant { get; set; }
    }
}
