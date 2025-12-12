using System;

namespace Core.Models
{
    /// <summary>
    /// Zaproszenie/zapytanie do serwisanta o podjęcie się naprawy usterki.
    /// Właściciel może wysłać zaproszenia do wielu serwisantów - pierwszy, który zaakceptuje, zostaje przypisany.
    /// </summary>
    public class ServiceRequest
    {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public Guid ServicemanId { get; set; }
        public Guid LandlordId { get; set; } // Właściciel który wysłał zaproszenie
        
        /// <summary>
        /// Status zaproszenia:
        /// - "Oczekujące" - oczekuje na decyzję serwisanta
        /// - "Zaakceptowane" - serwisant przyjął zgłoszenie
        /// - "Odrzucone" - serwisant odrzucił zgłoszenie
        /// - "Anulowane" - właściciel anulował zaproszenie
        /// - "Wygasłe" - inny serwisant już przyjął zgłoszenie
        /// </summary>
        public string Status { get; set; } = "Oczekujące";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? RespondedAt { get; set; }
        
        /// <summary>
        /// Opcjonalna wiadomość od właściciela do serwisanta
        /// </summary>
        public string? Message { get; set; }
        
        /// <summary>
        /// Opcjonalna odpowiedź/powód odrzucenia od serwisanta
        /// </summary>
        public string? ResponseMessage { get; set; }

        // Relacje
        public Issue Issue { get; set; }
        public User Serviceman { get; set; }
        public User Landlord { get; set; }
    }
}
