using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Core.Models;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using zarzadzanieMieszkaniami.Helpers;
using zarzadzanieMieszkaniami.Hubs;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ServiceRequestsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;
        private readonly ILogger<ServiceRequestsController> _logger;

        public ServiceRequestsController(AppDbContext context, IHubContext<ChatHub> hubContext, ILogger<ServiceRequestsController> logger)
        {
            _context = context;
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Pobiera oczekujące zaproszenia dla serwisanta (zakładka "Do akceptacji")
        /// Każdy zalogowany użytkownik może sprawdzić swoje zaproszenia (nie wymaga roli Serwisant)
        /// </summary>
        [HttpGet("pending")]
        [Authorize]
        public async Task<IActionResult> GetPendingRequests()
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var requests = await _context.ServiceRequests
                .Include(sr => sr.Issue)
                    .ThenInclude(i => i.Property)
                .Include(sr => sr.Issue)
                    .ThenInclude(i => i.ReportedBy)
                .Include(sr => sr.Landlord)
                .Where(sr => sr.ServicemanId == servicemanId && sr.Status == "Oczekujące")
                .OrderByDescending(sr => sr.CreatedAt)
                .ToListAsync();

            var response = requests.Select(sr => new ServiceRequestResponse
            {
                Id = sr.Id,
                IssueId = sr.IssueId,
                IssueTitle = sr.Issue.Title,
                IssueDescription = sr.Issue.Description,
                IssueCategory = sr.Issue.Category,
                IssuePriority = sr.Issue.Priority,
                IssueStatus = sr.Issue.Status,
                PropertyAddress = TextHelper.Capitalize(sr.Issue.Property?.Address),
                PropertyCity = TextHelper.Capitalize(sr.Issue.Property?.City),
                LandlordId = sr.LandlordId,
                LandlordName = TextHelper.CapitalizeName(sr.Landlord.FirstName, sr.Landlord.LastName),
                Message = sr.Message,
                CreatedAt = sr.CreatedAt,
                Status = sr.Status
            }).ToList();

            return Ok(response);
        }

        /// <summary>
        /// Pobiera historię zaproszeń dla serwisanta
        /// </summary>
        [HttpGet("history")]
        [Authorize]
        public async Task<IActionResult> GetRequestHistory()
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var requests = await _context.ServiceRequests
                .Include(sr => sr.Issue)
                    .ThenInclude(i => i.Property)
                .Include(sr => sr.Landlord)
                .Where(sr => sr.ServicemanId == servicemanId && sr.Status != "Oczekujące")
                .OrderByDescending(sr => sr.RespondedAt ?? sr.CreatedAt)
                .Take(50)
                .ToListAsync();

            var response = requests.Select(sr => new ServiceRequestResponse
            {
                Id = sr.Id,
                IssueId = sr.IssueId,
                IssueTitle = sr.Issue.Title,
                IssueDescription = sr.Issue.Description,
                IssueCategory = sr.Issue.Category,
                IssuePriority = sr.Issue.Priority,
                IssueStatus = sr.Issue.Status,
                PropertyAddress = TextHelper.Capitalize(sr.Issue.Property?.Address),
                PropertyCity = TextHelper.Capitalize(sr.Issue.Property?.City),
                LandlordId = sr.LandlordId,
                LandlordName = TextHelper.CapitalizeName(sr.Landlord.FirstName, sr.Landlord.LastName),
                Message = sr.Message,
                ResponseMessage = sr.ResponseMessage,
                CreatedAt = sr.CreatedAt,
                RespondedAt = sr.RespondedAt,
                Status = sr.Status
            }).ToList();

            return Ok(response);
        }

        /// <summary>
        /// Wysyła zaproszenie do serwisanta (może być wysłane do wielu serwisantów)
        /// </summary>
        [HttpPost("send")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> SendServiceRequest([FromBody] SendServiceRequestDto request)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy zgłoszenie istnieje i należy do właściciela
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == request.IssueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            if (issue.Property?.OwnerId != landlordId)
                return Forbid("To zgłoszenie nie należy do Ciebie");

            // Sprawdź czy serwisant należy do właściciela
            var hasServiceman = await _context.LandlordServicemen
                .AnyAsync(ls => ls.LandlordId == landlordId && ls.ServicemanId == request.ServicemanId);

            if (!hasServiceman)
                return BadRequest("Ten serwisant nie jest przypisany do Ciebie");

            // Sprawdź czy już istnieje oczekujące zaproszenie
            var existingRequest = await _context.ServiceRequests
                .AnyAsync(sr => sr.IssueId == request.IssueId && 
                               sr.ServicemanId == request.ServicemanId && 
                               sr.Status == "Oczekujące");

            if (existingRequest)
                return BadRequest("Już wysłano zaproszenie do tego serwisanta dla tego zgłoszenia");

            // Sprawdź czy zgłoszenie ma już przypisanego serwisanta
            var hasAssignedServiceman = await _context.IssueServicemen
                .AnyAsync(iss => iss.IssueId == request.IssueId);

            if (hasAssignedServiceman)
                return BadRequest("To zgłoszenie ma już przypisanego serwisanta");

            // Utwórz zaproszenie
            var serviceRequest = new ServiceRequest
            {
                Id = Guid.NewGuid(),
                IssueId = request.IssueId,
                ServicemanId = request.ServicemanId,
                LandlordId = landlordId,
                Message = request.Message,
                Status = "Oczekujące",
                CreatedAt = DateTime.UtcNow
            };

            _context.ServiceRequests.Add(serviceRequest);
            await _context.SaveChangesAsync();

            _logger.LogInformation($"Service request sent from landlord {landlordId} to serviceman {request.ServicemanId} for issue {request.IssueId}");

            // Wyślij powiadomienie przez SignalR
            await _hubContext.Clients.User(request.ServicemanId.ToString())
                .SendAsync("ServiceRequestReceived", new
                {
                    serviceRequest.Id,
                    serviceRequest.IssueId,
                    IssueTitle = issue.Title,
                    serviceRequest.Message,
                    serviceRequest.CreatedAt
                });

            return Ok(new { id = serviceRequest.Id, message = "Zaproszenie zostało wysłane" });
        }

        /// <summary>
        /// Wysyła zaproszenia do wielu serwisantów naraz
        /// </summary>
        [HttpPost("send-multiple")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> SendMultipleServiceRequests([FromBody] SendMultipleServiceRequestsDto request)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy zgłoszenie istnieje i należy do właściciela
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == request.IssueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            if (issue.Property?.OwnerId != landlordId)
                return Forbid("To zgłoszenie nie należy do Ciebie");

            // Sprawdź czy zgłoszenie ma już przypisanego serwisanta
            var hasAssignedServiceman = await _context.IssueServicemen
                .AnyAsync(iss => iss.IssueId == request.IssueId);

            if (hasAssignedServiceman)
                return BadRequest("To zgłoszenie ma już przypisanego serwisanta");

            var results = new List<object>();

            foreach (var servicemanId in request.ServicemanIds)
            {
                // Sprawdź czy serwisant należy do właściciela
                var hasServiceman = await _context.LandlordServicemen
                    .AnyAsync(ls => ls.LandlordId == landlordId && ls.ServicemanId == servicemanId);

                if (!hasServiceman)
                {
                    results.Add(new { servicemanId, success = false, error = "Serwisant nie jest przypisany do Ciebie" });
                    continue;
                }

                // Sprawdź czy już istnieje oczekujące zaproszenie
                var existingRequest = await _context.ServiceRequests
                    .AnyAsync(sr => sr.IssueId == request.IssueId && 
                                   sr.ServicemanId == servicemanId && 
                                   sr.Status == "Oczekujące");

                if (existingRequest)
                {
                    results.Add(new { servicemanId, success = false, error = "Zaproszenie już zostało wysłane" });
                    continue;
                }

                // Utwórz zaproszenie
                var serviceRequest = new ServiceRequest
                {
                    Id = Guid.NewGuid(),
                    IssueId = request.IssueId,
                    ServicemanId = servicemanId,
                    LandlordId = landlordId,
                    Message = request.Message,
                    Status = "Oczekujące",
                    CreatedAt = DateTime.UtcNow
                };

                _context.ServiceRequests.Add(serviceRequest);
                results.Add(new { servicemanId, success = true, requestId = serviceRequest.Id });

                // Wyślij powiadomienie przez SignalR
                await _hubContext.Clients.User(servicemanId.ToString())
                    .SendAsync("ServiceRequestReceived", new
                    {
                        serviceRequest.Id,
                        serviceRequest.IssueId,
                        IssueTitle = issue.Title,
                        serviceRequest.Message,
                        serviceRequest.CreatedAt
                    });
            }

            await _context.SaveChangesAsync();

            return Ok(results);
        }

        /// <summary>
        /// Akceptuje zaproszenie - serwisant zostaje przypisany do zgłoszenia
        /// </summary>
        [HttpPost("{id}/accept")]
        [Authorize]
        public async Task<IActionResult> AcceptRequest(Guid id)
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var serviceRequest = await _context.ServiceRequests
                .Include(sr => sr.Issue)
                .FirstOrDefaultAsync(sr => sr.Id == id);

            if (serviceRequest == null)
                return NotFound("Zaproszenie nie zostało znalezione");

            if (serviceRequest.ServicemanId != servicemanId)
                return Forbid("To zaproszenie nie jest dla Ciebie");

            if (serviceRequest.Status != "Oczekujące")
                return BadRequest("To zaproszenie nie jest już aktywne");

            // Sprawdź czy ktoś inny już nie przyjął tego zgłoszenia
            var alreadyAssigned = await _context.IssueServicemen
                .AnyAsync(iss => iss.IssueId == serviceRequest.IssueId);

            if (alreadyAssigned)
            {
                serviceRequest.Status = "Wygasłe";
                serviceRequest.RespondedAt = DateTime.UtcNow;
                serviceRequest.ResponseMessage = "Ktoś inny już przyjął to zgłoszenie";
                await _context.SaveChangesAsync();
                return BadRequest("To zgłoszenie zostało już przyjęte przez innego serwisanta");
            }

            // Zaakceptuj zaproszenie
            serviceRequest.Status = "Zaakceptowane";
            serviceRequest.RespondedAt = DateTime.UtcNow;

            // Przypisz serwisanta do zgłoszenia
            _context.IssueServicemen.Add(new IssueServiceman
            {
                IssueId = serviceRequest.IssueId,
                ServicemanId = servicemanId,
                AssignedAt = DateTime.UtcNow
            });

            // Zmień status zgłoszenia
            serviceRequest.Issue.Status = "Przypisane";

            // Anuluj pozostałe oczekujące zaproszenia dla tego zgłoszenia
            var otherRequests = await _context.ServiceRequests
                .Where(sr => sr.IssueId == serviceRequest.IssueId && 
                            sr.Id != id && 
                            sr.Status == "Oczekujące")
                .ToListAsync();

            foreach (var other in otherRequests)
            {
                other.Status = "Wygasłe";
                other.RespondedAt = DateTime.UtcNow;
                other.ResponseMessage = "Zgłoszenie zostało już przyjęte przez innego serwisanta";

                // Wyślij powiadomienie o wygaśnięciu
                await _hubContext.Clients.User(other.ServicemanId.ToString())
                    .SendAsync("ServiceRequestExpired", new
                    {
                        other.Id,
                        other.IssueId
                    });
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Service request {id} accepted by serviceman {servicemanId}");

            // Powiadom właściciela
            await _hubContext.Clients.User(serviceRequest.LandlordId.ToString())
                .SendAsync("ServiceRequestAccepted", new
                {
                    serviceRequest.Id,
                    serviceRequest.IssueId,
                    ServicemanId = servicemanId
                });

            return Ok(new { message = "Zaproszenie zostało zaakceptowane - jesteś teraz przypisany do tego zgłoszenia" });
        }

        /// <summary>
        /// Odrzuca zaproszenie
        /// </summary>
        [HttpPost("{id}/reject")]
        [Authorize]
        public async Task<IActionResult> RejectRequest(Guid id, [FromBody] RejectServiceRequestDto? request = null)
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var serviceRequest = await _context.ServiceRequests
                .FirstOrDefaultAsync(sr => sr.Id == id);

            if (serviceRequest == null)
                return NotFound("Zaproszenie nie zostało znalezione");

            if (serviceRequest.ServicemanId != servicemanId)
                return Forbid("To zaproszenie nie jest dla Ciebie");

            if (serviceRequest.Status != "Oczekujące")
                return BadRequest("To zaproszenie nie jest już aktywne");

            serviceRequest.Status = "Odrzucone";
            serviceRequest.RespondedAt = DateTime.UtcNow;
            serviceRequest.ResponseMessage = request?.Reason;

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Service request {id} rejected by serviceman {servicemanId}");

            // Powiadom właściciela
            await _hubContext.Clients.User(serviceRequest.LandlordId.ToString())
                .SendAsync("ServiceRequestRejected", new
                {
                    serviceRequest.Id,
                    serviceRequest.IssueId,
                    serviceRequest.ResponseMessage
                });

            return Ok(new { message = "Zaproszenie zostało odrzucone" });
        }

        /// <summary>
        /// Serwisant rezygnuje z już zaakceptowanego zgłoszenia
        /// </summary>
        [HttpPost("resign/{issueId}")]
        [Authorize]
        public async Task<IActionResult> ResignFromIssue(Guid issueId, [FromBody] ResignFromIssueDto? request = null)
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy serwisant jest przypisany do zgłoszenia
            var assignment = await _context.IssueServicemen
                .Include(iss => iss.Issue)
                .FirstOrDefaultAsync(iss => iss.IssueId == issueId && iss.ServicemanId == servicemanId);

            if (assignment == null)
                return NotFound("Nie jesteś przypisany do tego zgłoszenia");

            // Pobierz właściciela nieruchomości
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == issueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            // Usuń przypisanie
            _context.IssueServicemen.Remove(assignment);

            // Zmień status zgłoszenia z powrotem na "Nowe"
            issue.Status = "Nowe";

            // Znajdź i zaktualizuj ServiceRequest
            var serviceRequest = await _context.ServiceRequests
                .FirstOrDefaultAsync(sr => sr.IssueId == issueId && 
                                          sr.ServicemanId == servicemanId && 
                                          sr.Status == "Zaakceptowane");

            if (serviceRequest != null)
            {
                serviceRequest.Status = "Zrezygnowano";
                serviceRequest.ResponseMessage = request?.Reason ?? "Serwisant zrezygnował ze zgłoszenia";
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Serviceman {servicemanId} resigned from issue {issueId}");

            // Powiadom właściciela
            var landlordId = issue.Property?.OwnerId;
            if (landlordId.HasValue)
            {
                await _hubContext.Clients.User(landlordId.Value.ToString())
                    .SendAsync("ServicemanResigned", new
                    {
                        IssueId = issueId,
                        ServicemanId = servicemanId,
                        Reason = request?.Reason
                    });
            }

            return Ok(new { message = "Zrezygnowano ze zgłoszenia" });
        }

        /// <summary>
        /// Pobiera zaproszenia dla konkretnego zgłoszenia (dla właściciela)
        /// </summary>
        [HttpGet("for-issue/{issueId}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> GetRequestsForIssue(Guid issueId)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy zgłoszenie należy do właściciela
            var issue = await _context.Issues
                .Include(i => i.Property)
                .FirstOrDefaultAsync(i => i.Id == issueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            if (issue.Property?.OwnerId != landlordId)
                return Forbid("To zgłoszenie nie należy do Ciebie");

            var requests = await _context.ServiceRequests
                .Include(sr => sr.Serviceman)
                .Where(sr => sr.IssueId == issueId)
                .OrderByDescending(sr => sr.CreatedAt)
                .ToListAsync();

            var response = requests.Select(sr => new ServiceRequestHistoryItem
            {
                Id = sr.Id,
                ServicemanId = sr.ServicemanId,
                ServicemanName = TextHelper.CapitalizeName(sr.Serviceman.FirstName, sr.Serviceman.LastName),
                ServicemanFirstName = TextHelper.Capitalize(sr.Serviceman.FirstName),
                ServicemanLastName = TextHelper.Capitalize(sr.Serviceman.LastName),
                Status = sr.Status,
                Message = sr.Message,
                ResponseMessage = sr.ResponseMessage,
                CreatedAt = sr.CreatedAt,
                RespondedAt = sr.RespondedAt
            }).ToList();

            return Ok(response);
        }

        /// <summary>
        /// Anuluje zaproszenie (tylko właściciel może anulować)
        /// </summary>
        [HttpPost("{id}/cancel")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> CancelRequest(Guid id)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var serviceRequest = await _context.ServiceRequests
                .FirstOrDefaultAsync(sr => sr.Id == id);

            if (serviceRequest == null)
                return NotFound("Zaproszenie nie zostało znalezione");

            if (serviceRequest.LandlordId != landlordId)
                return Forbid("To zaproszenie nie zostało wysłane przez Ciebie");

            if (serviceRequest.Status != "Oczekujące")
                return BadRequest("Można anulować tylko oczekujące zaproszenia");

            serviceRequest.Status = "Anulowane";
            serviceRequest.RespondedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Powiadom serwisanta
            await _hubContext.Clients.User(serviceRequest.ServicemanId.ToString())
                .SendAsync("ServiceRequestCancelled", new
                {
                    serviceRequest.Id,
                    serviceRequest.IssueId
                });

            return Ok(new { message = "Zaproszenie zostało anulowane" });
        }

        /// <summary>
        /// Pobiera liczbę oczekujących zaproszeń (dla badge'a)
        /// </summary>
        [HttpGet("pending-count")]
        [Authorize]
        public async Task<IActionResult> GetPendingCount()
        {
            var servicemanId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            var count = await _context.ServiceRequests
                .CountAsync(sr => sr.ServicemanId == servicemanId && sr.Status == "Oczekujące");

            return Ok(new { count });
        }

        /// <summary>
        /// Sprawdza czy użytkownik jest serwisantem u jakiegoś właściciela (ma zaproszenia lub jest przypisany)
        /// </summary>
        [HttpGet("is-serviceman")]
        [Authorize]
        public async Task<IActionResult> IsServiceman()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy użytkownik jest dodany jako serwisant u jakiegoś właściciela
            var isInLandlordServicemen = await _context.LandlordServicemen
                .AnyAsync(ls => ls.ServicemanId == userId);

            // Sprawdź czy ma jakiekolwiek zaproszenia (oczekujące lub zaakceptowane)
            var hasServiceRequests = await _context.ServiceRequests
                .AnyAsync(sr => sr.ServicemanId == userId && 
                               (sr.Status == "Oczekujące" || sr.Status == "Zaakceptowane"));

            // Sprawdź czy jest przypisany do jakiegoś zgłoszenia
            var isAssignedToIssue = await _context.IssueServicemen
                .AnyAsync(iss => iss.ServicemanId == userId);

            var isServiceman = isInLandlordServicemen || hasServiceRequests || isAssignedToIssue;

            return Ok(new { isServiceman });
        }

        /// <summary>
        /// Usuwa przypisanie serwisanta ze zgłoszenia (tylko właściciel może usunąć)
        /// </summary>
        [HttpPost("remove-serviceman/{issueId}")]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> RemoveServicemanFromIssue(Guid issueId, [FromBody] RemoveServicemanDto? request = null)
        {
            var landlordId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);

            // Sprawdź czy zgłoszenie należy do właściciela
            var issue = await _context.Issues
                .Include(i => i.Property)
                .Include(i => i.AssignedServicemen)
                .FirstOrDefaultAsync(i => i.Id == issueId);

            if (issue == null)
                return NotFound("Zgłoszenie nie zostało znalezione");

            if (issue.Property?.OwnerId != landlordId)
                return Forbid("To zgłoszenie nie należy do Ciebie");

            // Pobierz przypisanego serwisanta
            var assignment = issue.AssignedServicemen?.FirstOrDefault();
            if (assignment == null)
                return BadRequest("To zgłoszenie nie ma przypisanego serwisanta");

            var servicemanId = assignment.ServicemanId;

            // Usuń przypisanie
            _context.IssueServicemen.Remove(assignment);

            // Zmień status zgłoszenia na "Nowe" (można ponownie przypisać)
            issue.Status = "Nowe";

            // Znajdź i zaktualizuj ServiceRequest
            var serviceRequest = await _context.ServiceRequests
                .FirstOrDefaultAsync(sr => sr.IssueId == issueId && 
                                          sr.ServicemanId == servicemanId && 
                                          sr.Status == "Zaakceptowane");

            if (serviceRequest != null)
            {
                serviceRequest.Status = "Anulowane";
                serviceRequest.RespondedAt = DateTime.UtcNow;
                serviceRequest.ResponseMessage = request?.Reason ?? "Właściciel usunął przypisanie serwisanta";
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation($"Landlord {landlordId} removed serviceman {servicemanId} from issue {issueId}");

            // Powiadom serwisanta
            await _hubContext.Clients.User(servicemanId.ToString())
                .SendAsync("RemovedFromIssue", new
                {
                    IssueId = issueId,
                    Reason = request?.Reason
                });

            return Ok(new { message = "Serwisant został usunięty ze zgłoszenia" });
        }
    }

    #region DTOs

    public class ServiceRequestResponse
    {
        public Guid Id { get; set; }
        public Guid IssueId { get; set; }
        public string IssueTitle { get; set; }
        public string IssueDescription { get; set; }
        public string IssueCategory { get; set; }
        public string IssuePriority { get; set; }
        public string IssueStatus { get; set; }
        public string PropertyAddress { get; set; }
        public string PropertyCity { get; set; }
        public Guid LandlordId { get; set; }
        public string LandlordName { get; set; }
        public string? Message { get; set; }
        public string? ResponseMessage { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
        public string Status { get; set; }
    }

    public class SendServiceRequestDto
    {
        public Guid IssueId { get; set; }
        public Guid ServicemanId { get; set; }
        public string? Message { get; set; }
    }

    public class SendMultipleServiceRequestsDto
    {
        public Guid IssueId { get; set; }
        public List<Guid> ServicemanIds { get; set; }
        public string? Message { get; set; }
    }

    public class RejectServiceRequestDto
    {
        public string? Reason { get; set; }
    }

    public class ResignFromIssueDto
    {
        public string? Reason { get; set; }
    }

    public class RemoveServicemanDto
    {
        public string? Reason { get; set; }
    }

    public class ServiceRequestHistoryItem
    {
        public Guid Id { get; set; }
        public Guid ServicemanId { get; set; }
        public string ServicemanName { get; set; }
        public string ServicemanFirstName { get; set; }
        public string ServicemanLastName { get; set; }
        public string Status { get; set; }
        public string? Message { get; set; }
        public string? ResponseMessage { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? RespondedAt { get; set; }
    }

    #endregion
}
