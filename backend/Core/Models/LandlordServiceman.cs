using System;

namespace Core.Models
{
    // Relacja many-to-many: Landlord (Wynajmujący) <-> Serviceman (Serwisant)
    // Wynajmujący może mieć wielu serwisantów, serwisant może pracować dla wielu wynajmujących
    public class LandlordServiceman
    {
        public Guid LandlordId { get; set; }
        public Guid ServicemanId { get; set; }
        public DateTime AssignedAt { get; set; }

        // Relacje
        public User Landlord { get; set; }
        public User Serviceman { get; set; }
    }
}
