using System;

namespace Core.Models
{
    /// <summary>
    /// Notatka użytkownika - prywatna notatka właściciela o najemcy lub serwisancie
    /// </summary>
    public class UserNote
    {
        public Guid Id { get; set; }
        
        /// <summary>
        /// Właściciel notatki (kto ją utworzył)
        /// </summary>
        public Guid OwnerId { get; set; }
        public User Owner { get; set; }
        
        /// <summary>
        /// Użytkownik, którego dotyczy notatka (najemca lub serwisant)
        /// </summary>
        public Guid TargetUserId { get; set; }
        public User TargetUser { get; set; }
        
        /// <summary>
        /// Treść notatki
        /// </summary>
        public string Content { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
