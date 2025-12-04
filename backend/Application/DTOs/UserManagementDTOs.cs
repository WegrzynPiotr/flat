namespace Application.DTOs
{
    public class AssignTenantRequest
    {
        public Guid PropertyId { get; set; }
        public Guid TenantId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class AssignServicemanToIssueRequest
    {
        public Guid IssueId { get; set; }
        public Guid ServicemanId { get; set; }
    }

    public class CreateUserRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; } // "Najemca" lub "Serwisant"
    }

    public class UserResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Role { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
