using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace Core.Models
{
    public class User : IdentityUser<Guid>
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Wynajmujący - ID wynajmującego który utworzył to konto (dla najemców i serwisantów)
        public Guid? CreatedByLandlordId { get; set; }

        // Relacje - Nieruchomości
        public ICollection<Property> OwnedProperties { get; set; }
        
        // Relacje - Najemcy (many-to-many przez PropertyTenant)
        public ICollection<PropertyTenant> TenantProperties { get; set; }
        
        // Relacje - Zgłoszenia
        public ICollection<Issue> ReportedIssues { get; set; }
        public ICollection<IssueServiceman> AssignedIssues { get; set; }
        
        // Relacje - Komentarze
        public ICollection<IssueComment> Comments { get; set; }
        
        // Relacje - Wiadomości
        public ICollection<Message> SentMessages { get; set; }
        public ICollection<Message> ReceivedMessages { get; set; }
        
        // Relacje - Wynajmujący <-> Serwisant
        public ICollection<LandlordServiceman> LandlordServicemen { get; set; }
        public ICollection<LandlordServiceman> ServicemanLandlords { get; set; }
        
        // Relacje - Zaproszenia
        public ICollection<UserInvitation> SentInvitations { get; set; }
        public ICollection<UserInvitation> ReceivedInvitations { get; set; }
        
        // Relacje - Zapytania o naprawę (ServiceRequest)
        public ICollection<ServiceRequest> ServiceRequestsReceived { get; set; } // Jako serwisant
        public ICollection<ServiceRequest> ServiceRequestsSent { get; set; } // Jako właściciel
    }
}
