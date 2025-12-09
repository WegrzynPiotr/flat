using System;

namespace Core.Models
{
    // Relacja many-to-many: Issue <-> Serviceman
    // Zgłoszenie może mieć wielu serwisantów, serwisant może być przypisany do wielu zgłoszeń
    public class IssueServiceman
    {
        public Guid IssueId { get; set; }
        public Guid ServicemanId { get; set; }
        public DateTime AssignedAt { get; set; }

        // Relacje
        public Issue Issue { get; set; }
        public User Serviceman { get; set; }
    }
}
