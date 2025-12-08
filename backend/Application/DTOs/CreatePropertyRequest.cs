namespace Application.DTOs
{
    public class CreatePropertyRequest
    {
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public int RoomsCount { get; set; }
        public decimal Area { get; set; }
        public string? Description { get; set; }
    }
    
    public class UpdatePropertyRequest
    {
        public string Address { get; set; }
        public string City { get; set; }
        public string PostalCode { get; set; }
        public int RoomsCount { get; set; }
        public decimal Area { get; set; }
        public string? Description { get; set; }
    }
}
