using System;

namespace Core.Models
{
    /// <summary>
    /// Zaproszenie użytkownika do bycia najemcą lub serwisantem danego właściciela.
    /// Po akceptacji tworzona jest odpowiednia relacja (PropertyTenant lub LandlordServiceman).
    /// </summary>
    public class UserInvitation
    {
        public Guid Id { get; set; }
        
        /// <summary>
        /// ID właściciela który wysyła zaproszenie
        /// </summary>
        public Guid InviterId { get; set; }
        
        /// <summary>
        /// ID użytkownika który otrzymuje zaproszenie
        /// </summary>
        public Guid InviteeId { get; set; }
        
        /// <summary>
        /// Typ zaproszenia: "Najemca" lub "Serwisant"
        /// </summary>
        public string InvitationType { get; set; }
        
        /// <summary>
        /// Status zaproszenia: "Pending", "Accepted", "Rejected"
        /// </summary>
        public string Status { get; set; }
        
        /// <summary>
        /// Wiadomość od właściciela (opcjonalna)
        /// </summary>
        public string? Message { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? RespondedAt { get; set; }

        // Relacje
        public User Inviter { get; set; }
        public User Invitee { get; set; }
    }
}
