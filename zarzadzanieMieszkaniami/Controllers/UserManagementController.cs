using Application.DTOs;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using zarzadzanieMieszkaniami.Helpers;

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
                FirstName = TextHelper.Capitalize(user.FirstName),
                LastName = TextHelper.Capitalize(user.LastName),
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

            Console.WriteLine($"🔵 AssignTenant: landlordId={landlordId}, propertyId={request.PropertyId}, tenantId={request.TenantId}");

            // Sprawdź czy mieszkanie należy do wynajmującego
            var property = await _context.Properties.FindAsync(request.PropertyId);
            if (property == null || property.OwnerId != landlordId)
            {
                Console.WriteLine($"🔴 AssignTenant: Property not found or not owned by landlord");
                return Forbid();
            }

            // Sprawdź czy użytkownik istnieje
            var tenant = await _userManager.FindByIdAsync(request.TenantId.ToString());
            if (tenant == null)
            {
                Console.WriteLine($"🔴 AssignTenant: Tenant not found");
                return BadRequest("Użytkownik nie istnieje");
            }

            // Sprawdź czy użytkownik jest najemcą tego właściciela
            // (zaakceptował zaproszenie jako Najemca LUB został przez niego utworzony)
            var isAcceptedTenant = await _context.UserInvitations
                .AnyAsync(i => i.InviterId == landlordId && 
                              i.InviteeId == request.TenantId && 
                              i.InvitationType == "Najemca" && 
                              i.Status == "Accepted");

            var isCreatedByLandlord = tenant.CreatedByLandlordId == landlordId;

            Console.WriteLine($"🔵 AssignTenant: isAcceptedTenant={isAcceptedTenant}, isCreatedByLandlord={isCreatedByLandlord}");

            if (!isAcceptedTenant && !isCreatedByLandlord)
            {
                Console.WriteLine($"🔴 AssignTenant: User is not a tenant of this landlord");
                return BadRequest("Użytkownik nie jest Twoim najemcą. Najpierw wyślij mu zaproszenie jako Najemca.");
            }

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

        // Usuń najemcę z mieszkania (kończy najem, zachowuje historię)
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

            // Zamiast usuwać relację, kończymy najem ustawiając datę zakończenia na wczoraj
            // Dzięki temu były najemca zachowuje dostęp do historii (dokumenty, mieszkanie wyszarzone)
            // Używamy czasu lokalnego (Europa/Warszawa) dla poprawnego obliczenia "wczoraj"
            // ale konwertujemy wynik z powrotem do UTC dla PostgreSQL
            var polandTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time");
            var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, polandTimeZone);
            var yesterdayLocal = localNow.Date.AddDays(-1);
            var todayLocal = localNow.Date;
            
            // Konwertuj datę lokalną na UTC dla PostgreSQL (ustawiamy na początek dnia w UTC)
            var yesterdayUtc = DateTime.SpecifyKind(yesterdayLocal, DateTimeKind.Utc);
            var todayUtc = DateTime.SpecifyKind(todayLocal, DateTimeKind.Utc);
            
            // Jeśli najem jeszcze się nie rozpoczął, po prostu usuń relację
            if (propertyTenant.StartDate > todayUtc)
            {
                _context.PropertyTenants.Remove(propertyTenant);
            }
            else
            {
                // Najem trwa lub trwał - zakończ go
                propertyTenant.EndDate = yesterdayUtc;
                _context.PropertyTenants.Update(propertyTenant);
            }
            
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

            _logger.LogInformation($"HasServiceman check - LandlordId: {landlordId}, ServicemanId: {request.ServicemanId}, Result: {hasServiceman}");

            if (!hasServiceman)
                return BadRequest("Ten serwisant nie jest przypisany do Ciebie");

            // Usuń wszystkich dotychczasowych serwisantów przypisanych do tego zgłoszenia
            var existingAssignments = await _context.IssueServicemen
                .Where(iss => iss.IssueId == request.IssueId)
                .ToListAsync();

            if (existingAssignments.Any())
            {
                _logger.LogInformation($"Removing {existingAssignments.Count} existing serviceman assignments from issue {request.IssueId}");
                _context.IssueServicemen.RemoveRange(existingAssignments);
            }

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

        // Pobierz listę najemców wynajmującego (wszystkich zaakceptowanych przez zaproszenia lub utworzonych przez tego właściciela)
        [HttpGet("my-tenants")]
        [Authorize]
        public async Task<IActionResult> GetMyTenants()
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Sprawdź czy użytkownik jest właścicielem jakiegoś mieszkania
            var hasProperty = await _context.Properties.AnyAsync(p => p.OwnerId == landlordId);
            if (!hasProperty)
            {
                return Ok(new List<UserResponse>());
            }

            Console.WriteLine($"🔵 Getting tenants for landlord: {landlordId}");

            // Pobierz najemców z zaakceptowanych zaproszeń (jako Najemca)
            var acceptedTenantIds = await _context.UserInvitations
                .Where(i => i.InviterId == landlordId && 
                           i.InvitationType == "Najemca" && 
                           i.Status == "Accepted")
                .Select(i => i.InviteeId)
                .ToListAsync();

            Console.WriteLine($"🔵 Accepted tenant IDs from invitations: {string.Join(", ", acceptedTenantIds)}");

            // Pobierz też najemców utworzonych przez tego właściciela (stary system)
            var createdTenantIds = await _context.Users
                .Where(u => u.CreatedByLandlordId == landlordId)
                .Select(u => u.Id)
                .ToListAsync();

            Console.WriteLine($"🔵 Created tenant IDs: {string.Join(", ", createdTenantIds)}");

            // Połącz obie listy
            var allTenantIds = acceptedTenantIds.Union(createdTenantIds).Distinct().ToList();

            Console.WriteLine($"🔵 All tenant IDs: {string.Join(", ", allTenantIds)}");

            // Pobierz użytkowników (nie filtrujemy po roli - zaproszenie typu Najemca wystarczy)
            var tenants = await _context.Users
                .Where(u => allTenantIds.Contains(u.Id))
                .ToListAsync();

            Console.WriteLine($"🔵 Found {tenants.Count} tenants");

            // Pobierz informacje o nieruchomościach dla każdego najemcy
            var responses = new List<UserResponse>();
            foreach (var tenant in tenants)
            {
                var properties = await _context.PropertyTenants
                    .Where(pt => pt.TenantId == tenant.Id)
                    .Include(pt => pt.Property)
                    .Where(pt => pt.Property.OwnerId == landlordId) // Tylko nieruchomości tego właściciela
                    .Select(pt => pt.Property.Address)
                    .ToListAsync();

                responses.Add(new UserResponse
                {
                    Id = tenant.Id,
                    Email = tenant.Email,
                    FirstName = TextHelper.Capitalize(tenant.FirstName),
                    LastName = TextHelper.Capitalize(tenant.LastName),
                    Role = "Najemca",
                    CreatedAt = tenant.CreatedAt,
                    Properties = properties
                });

                Console.WriteLine($"✅ Tenant: {tenant.FirstName} {tenant.LastName}, Properties: {properties.Count}");
            }

            Console.WriteLine($"🔵 Returning {responses.Count} tenants");

            return Ok(responses);
        }

        // Pobierz listę serwisantów wynajmującego (z zaakceptowanych zaproszeń i relacji)
        [HttpGet("my-servicemen")]
        [Authorize]
        public async Task<IActionResult> GetMyServicemen()
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            // Sprawdź czy użytkownik jest właścicielem jakiegoś mieszkania
            var hasProperty = await _context.Properties.AnyAsync(p => p.OwnerId == landlordId);
            if (!hasProperty)
            {
                return Ok(new List<UserResponse>());
            }

            Console.WriteLine($"🔵 Getting servicemen for landlord: {landlordId}");

            // Pobierz serwisantów z relacji LandlordServicemen
            var servicemanIds = await _context.LandlordServicemen
                .Where(ls => ls.LandlordId == landlordId)
                .Select(ls => ls.ServicemanId)
                .ToListAsync();

            // Pobierz też serwisantów z zaakceptowanych zaproszeń (na wypadek gdyby relacja nie została utworzona)
            var acceptedServicemanIds = await _context.UserInvitations
                .Where(i => i.InviterId == landlordId && 
                           i.InvitationType == "Serwisant" && 
                           i.Status == "Accepted")
                .Select(i => i.InviteeId)
                .ToListAsync();

            // Połącz obie listy
            var allServicemanIds = servicemanIds.Union(acceptedServicemanIds).Distinct().ToList();

            Console.WriteLine($"🔵 Found {allServicemanIds.Count} servicemen IDs");

            var servicemen = await _context.Users
                .Where(u => allServicemanIds.Contains(u.Id))
                .ToListAsync();

            var responses = servicemen.Select(s => new UserResponse
            {
                Id = s.Id,
                Email = s.Email,
                FirstName = TextHelper.Capitalize(s.FirstName),
                LastName = TextHelper.Capitalize(s.LastName),
                Role = "Serwisant",
                CreatedAt = s.CreatedAt
            }).ToList();

            Console.WriteLine($"🔵 Returning {responses.Count} servicemen");

            return Ok(responses);
        }

        // Usuń użytkownika (najemcę lub serwisanta)
        // Najemca: usuwana jest relacja z właścicielem, ale konto pozostaje - user ma nadal dostęp do historii
        // Serwisant: usuwana jest relacja z właścicielem
        [HttpDelete("remove-user/{userId}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> RemoveUser(Guid userId)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return NotFound("Użytkownik nie istnieje");

            // Sprawdź czy to najemca czy serwisant tego właściciela
            var isMyTenant = await _context.UserInvitations
                .AnyAsync(i => i.InviterId == landlordId && 
                              i.InviteeId == userId && 
                              i.InvitationType == "Najemca" && 
                              i.Status == "Accepted") ||
                user.CreatedByLandlordId == landlordId;

            var isMyServiceman = await _context.LandlordServicemen
                .AnyAsync(ls => ls.LandlordId == landlordId && ls.ServicemanId == userId) ||
                await _context.UserInvitations
                    .AnyAsync(i => i.InviterId == landlordId && 
                                  i.InviteeId == userId && 
                                  i.InvitationType == "Serwisant" && 
                                  i.Status == "Accepted");

            if (!isMyTenant && !isMyServiceman)
                return BadRequest("Ten użytkownik nie jest Twoim najemcą ani serwisantem");

            // Sprawdź czy najemca jest przypisany do któregoś z mieszkań tego właściciela (z aktywnym najmem)
            if (isMyTenant)
            {
                var activeAssignment = await _context.PropertyTenants
                    .Include(pt => pt.Property)
                    .Where(pt => pt.TenantId == userId && pt.Property.OwnerId == landlordId)
                    .Where(pt => pt.EndDate == null || pt.EndDate >= DateTime.UtcNow.Date)
                    .FirstOrDefaultAsync();

                if (activeAssignment != null)
                {
                    return BadRequest($"Nie można usunąć najemcy - jest aktywnie przypisany do mieszkania: {activeAssignment.Property.Address}. Najpierw zakończ jego najem lub usuń go z mieszkania.");
                }
            }

            // Sprawdź czy serwisant jest przypisany do otwartych usterek
            if (isMyServiceman)
            {
                var openIssue = await _context.IssueServicemen
                    .Include(ism => ism.Issue)
                        .ThenInclude(i => i.Property)
                    .Where(ism => ism.ServicemanId == userId)
                    .Where(ism => ism.Issue.Property.OwnerId == landlordId)
                    .Where(ism => ism.Issue.Status != "Rozwiązane" && ism.Issue.Status != "Zamknięte")
                    .Select(ism => new { ism.Issue.Title, ism.Issue.Property.Address })
                    .FirstOrDefaultAsync();

                if (openIssue != null)
                {
                    return BadRequest($"Nie można usunąć serwisanta - jest przypisany do otwartej usterki: \"{openIssue.Title}\" ({openIssue.Address}). Najpierw zmień przypisanie lub rozwiąż usterkę.");
                }
            }

            // Usuwamy tylko relacje, nie konto użytkownika
            // Dzięki temu użytkownik nadal ma dostęp do historii (wiadomości, poprzednie mieszkania itp.)

            if (isMyTenant)
            {
                // Usuń zaproszenie typu Najemca
                var invitation = await _context.UserInvitations
                    .FirstOrDefaultAsync(i => i.InviterId == landlordId && 
                                             i.InviteeId == userId && 
                                             i.InvitationType == "Najemca");
                if (invitation != null)
                {
                    _context.UserInvitations.Remove(invitation);
                }

                // Usuń powiązanie CreatedByLandlordId jeśli był utworzony przez tego właściciela
                if (user.CreatedByLandlordId == landlordId)
                {
                    user.CreatedByLandlordId = null;
                    await _userManager.UpdateAsync(user);
                }

                // NIE usuwamy PropertyTenants - to historia najmu, musi zostać dla wglądu
                // Ale możemy oznaczyć nieaktywne przypisania
            }

            if (isMyServiceman)
            {
                // Usuń relację LandlordServicemen
                var relation = await _context.LandlordServicemen
                    .FirstOrDefaultAsync(ls => ls.LandlordId == landlordId && ls.ServicemanId == userId);
                if (relation != null)
                {
                    _context.LandlordServicemen.Remove(relation);
                }

                // Usuń zaproszenie typu Serwisant
                var invitation = await _context.UserInvitations
                    .FirstOrDefaultAsync(i => i.InviterId == landlordId && 
                                             i.InviteeId == userId && 
                                             i.InvitationType == "Serwisant");
                if (invitation != null)
                {
                    _context.UserInvitations.Remove(invitation);
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"User {userId} removed from landlord {landlordId}'s list");

            return Ok(new { message = "Użytkownik został usunięty z Twojej listy" });
        }
    }
}
