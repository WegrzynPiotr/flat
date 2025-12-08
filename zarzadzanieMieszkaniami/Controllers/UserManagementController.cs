using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserManagementController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly UserManager<User> _userManager;
        private readonly ILogger<UserManagementController> _logger;

        public UserManagementController(AppDbContext context, UserManager<User> userManager, ILogger<UserManagementController> logger)
        {
            _context = context;
            _userManager = userManager;
            _logger = logger;
        }

        // Właściciel tworzy konto dla najemcy lub serwisanta
        [HttpPost("create-user")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            if (request.Role != "Najemca" && request.Role != "Serwisant")
                return BadRequest("Możesz tworzyć tylko konta dla Najemców i Serwisantów");

            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                EmailConfirmed = true,
                CreatedAt = DateTime.UtcNow,
                CreatedByLandlordId = landlordId
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new { message = errors });
            }

            await _userManager.AddToRoleAsync(user, request.Role);

            // Jeśli to serwisant, automatycznie dodaj relację
            if (request.Role == "Serwisant")
            {
                _context.LandlordServicemen.Add(new LandlordServiceman
                {
                    LandlordId = landlordId,
                    ServicemanId = user.Id,
                    AssignedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
            }

            return Ok(new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = request.Role,
                CreatedAt = user.CreatedAt
            });
        }

        // Przypisz najemcę do mieszkania
        [HttpPost("assign-tenant")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> AssignTenant([FromBody] AssignTenantRequest request)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy mieszkanie należy do wynajmującego
            var property = await _context.Properties.FindAsync(request.PropertyId);
            if (property == null || property.OwnerId != landlordId)
                return Forbid();

            // Sprawdź czy użytkownik jest najemcą
            var tenant = await _userManager.FindByIdAsync(request.TenantId.ToString());
            var roles = await _userManager.GetRolesAsync(tenant);
            if (!roles.Contains("Najemca"))
                return BadRequest("Użytkownik nie jest najemcą");

            // Sprawdź czy najemca już jest przypisany do nieruchomości
            var existingTenant = await _context.PropertyTenants
                .FirstOrDefaultAsync(pt => pt.PropertyId == request.PropertyId && pt.TenantId == request.TenantId);

            if (existingTenant != null)
            {
                // Zaktualizuj daty
                existingTenant.StartDate = request.StartDate;
                existingTenant.EndDate = request.EndDate;
                _context.PropertyTenants.Update(existingTenant);
            }
            else
            {
                // Dodaj nowego najemcę
                var propertyTenant = new PropertyTenant
                {
                    PropertyId = request.PropertyId,
                    TenantId = request.TenantId,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate
                };
                _context.PropertyTenants.Add(propertyTenant);
            }

            await _context.SaveChangesAsync();

            return Ok();
        }

        // Usuń najemcę z mieszkania
        [HttpDelete("remove-tenant")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> RemoveTenant([FromQuery] Guid propertyId, [FromQuery] Guid tenantId)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy mieszkanie należy do wynajmującego
            var property = await _context.Properties.FindAsync(propertyId);
            if (property == null || property.OwnerId != landlordId)
                return Forbid();

            var propertyTenant = await _context.PropertyTenants
                .FirstOrDefaultAsync(pt => pt.PropertyId == propertyId && pt.TenantId == tenantId);

            if (propertyTenant == null)
                return NotFound("Najemca nie jest przypisany do tego mieszkania");

            _context.PropertyTenants.Remove(propertyTenant);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Przypisz serwisanta do zgłoszenia
        [HttpPost("assign-serviceman")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> AssignServiceman([FromBody] AssignServicemanToIssueRequest request)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy zgłoszenie istnieje i należy do właściciela
            var issueWithProperty = await (from issue in _context.Issues
                                          join property in _context.Properties on issue.PropertyId equals property.Id
                                          where issue.Id == request.IssueId
                                          select new
                                          {
                                              Issue = issue,
                                              PropertyOwnerId = property.OwnerId
                                          }).FirstOrDefaultAsync();

            if (issueWithProperty == null)
            {
                _logger.LogWarning($"Issue not found: {request.IssueId}");
                return NotFound("Zgłoszenie nie zostało znalezione");
            }

            _logger.LogInformation($"Checking ownership - LandlordId: {landlordId}, PropertyOwnerId: {issueWithProperty.PropertyOwnerId}");

            if (issueWithProperty.PropertyOwnerId != landlordId)
            {
                _logger.LogWarning($"Access denied - Issue {request.IssueId} belongs to property owned by {issueWithProperty.PropertyOwnerId}, not {landlordId}");
                return Forbid();
            }

            // Sprawdź czy serwisant należy do wynajmującego
            var hasServiceman = await _context.LandlordServicemen
                .AnyAsync(ls => ls.LandlordId == landlordId && ls.ServicemanId == request.ServicemanId);

            if (!hasServiceman)
                return BadRequest("Ten serwisant nie jest przypisany do Ciebie");

            // Sprawdź czy już nie jest przypisany
            var alreadyAssigned = await _context.IssueServicemen
                .AnyAsync(iss => iss.IssueId == request.IssueId && iss.ServicemanId == request.ServicemanId);

            if (alreadyAssigned)
                return BadRequest("Serwisant jest już przypisany do tego zgłoszenia");

            _context.IssueServicemen.Add(new IssueServiceman
            {
                IssueId = request.IssueId,
                ServicemanId = request.ServicemanId,
                AssignedAt = DateTime.UtcNow
            });

            // Zmień status zgłoszenia
            issueWithProperty.Issue.Status = "Przypisane";
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Successfully assigned serviceman {request.ServicemanId} to issue {request.IssueId}");
            return Ok();
        }

        // Pobierz listę najemców wynajmującego (wszystkich utworzonych przez tego właściciela)
        [HttpGet("my-tenants")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> GetMyTenants()
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            Console.WriteLine($"🔵 Getting tenants for landlord: {landlordId}");

            // DEBUG: Pokaż wszystkich użytkowników w systemie
            var allSystemUsers = await _context.Users.ToListAsync();
            Console.WriteLine($"🔍 Total users in system: {allSystemUsers.Count}");
            foreach (var u in allSystemUsers)
            {
                var userRoles = await _userManager.GetRolesAsync(u);
                Console.WriteLine($"🔍 User: {u.Email}, CreatedBy: {u.CreatedByLandlordId}, Roles: {string.Join(",", userRoles)}");
            }

            // Pobierz wszystkich użytkowników utworzonych przez tego właściciela z rolą Najemca
            var allUsers = await _context.Users
                .Where(u => u.CreatedByLandlordId == landlordId)
                .ToListAsync();

            Console.WriteLine($"🔵 Found {allUsers.Count} users created by landlord");

            // Filtruj tylko tych z rolą Najemca
            var tenants = new List<User>();
            foreach (var user in allUsers)
            {
                var roles = await _userManager.GetRolesAsync(user);
                if (roles.Contains("Najemca"))
                {
                    tenants.Add(user);
                    Console.WriteLine($"✅ Tenant found: {user.FirstName} {user.LastName}");
                }
            }

            Console.WriteLine($"🔵 Total tenants: {tenants.Count}");

            // Pobierz informacje o nieruchomościach dla każdego najemcy
            var responses = new List<UserResponse>();
            foreach (var tenant in tenants)
            {
                var properties = await _context.PropertyTenants
                    .Where(pt => pt.TenantId == tenant.Id)
                    .Include(pt => pt.Property)
                    .Select(pt => pt.Property.Address)
                    .ToListAsync();

                responses.Add(new UserResponse
                {
                    Id = tenant.Id,
                    Email = tenant.Email,
                    FirstName = tenant.FirstName,
                    LastName = tenant.LastName,
                    Role = "Najemca",
                    CreatedAt = tenant.CreatedAt,
                    Properties = properties
                });
            }

            return Ok(responses);
        }

        // Pobierz listę serwisantów wynajmującego
        [HttpGet("my-servicemen")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> GetMyServicemen()
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var servicemen = await _context.LandlordServicemen
                .Where(ls => ls.LandlordId == landlordId)
                .Select(ls => ls.Serviceman)
                .ToListAsync();

            var responses = servicemen.Select(s => new UserResponse
            {
                Id = s.Id,
                Email = s.Email,
                FirstName = s.FirstName,
                LastName = s.LastName,
                Role = "Serwisant",
                CreatedAt = s.CreatedAt
            }).ToList();

            return Ok(responses);
        }
    }
}
