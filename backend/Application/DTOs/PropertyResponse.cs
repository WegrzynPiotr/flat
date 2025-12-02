namespace Application.DTOs
{
    public class PropertyResponse
    {
        public Guid Id { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public int RoomsCount { get; set; }
        public decimal Area { get; set; }
        public Guid OwnerId { get; set; }
        public Guid? CurrentTenantId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
