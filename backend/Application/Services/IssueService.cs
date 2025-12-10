using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;

namespace Application.Services
{
    public class IssueService
    {
        private readonly IIssueRepository _issueRepository;
        private readonly IPropertyRepository _propertyRepository;

        public IssueService(IIssueRepository issueRepository, IPropertyRepository propertyRepository)
        {
            _issueRepository = issueRepository;
            _propertyRepository = propertyRepository;
        }

        public async Task<IEnumerable<Issue>> GetAllIssuesAsync(Guid userId, string userRole)
        {
            var allIssues = await _issueRepository.GetAllAsync();
            
            Console.WriteLine($"🔵 GetAllIssuesAsync - User: {userId}, Role: {userRole}");
            Console.WriteLine($"🔵 Total issues in DB: {allIssues.Count()}");
            
            // Administrator widzi wszystkie usterki
            if (userRole == "Administrator")
            {
                return allIssues;
            }
            
            // Pobierz nieruchomości powiązane z użytkownikiem
            var now = DateTime.UtcNow;
            var userProperties = await _propertyRepository.GetAllAsync();
            var accessiblePropertyIds = userProperties
                .Where(p => p.OwnerId == userId || 
                           p.Tenants.Any(pt => pt.TenantId == userId &&
                                              pt.StartDate <= now &&
                                              (pt.EndDate == null || pt.EndDate >= now)))
                .Select(p => p.Id)
                .ToList();
            
            // Filtruj usterki:
            // 1. Należące do nieruchomości użytkownika (właściciel lub AKTYWNY najemca)
            // 2. Zgłoszone przez użytkownika
            // 3. Przypisane do użytkownika jako serwisant
            var filteredIssues = allIssues.Where(i => 
                accessiblePropertyIds.Contains(i.PropertyId) || 
                i.ReportedById == userId ||
                (i.AssignedServicemen != null && i.AssignedServicemen.Any(ais => ais.ServicemanId == userId))
            ).ToList();
            
            Console.WriteLine($"🔵 Returning {filteredIssues.Count} issues for user");
            return filteredIssues;
        }

        public async Task<Issue> GetIssueByIdAsync(Guid id)
        {
            return await _issueRepository.GetByIdAsync(id);
        }

        public async Task<Issue> CreateIssueAsync(Issue issue)
        {
            issue.Id = Guid.NewGuid();
            issue.ReportedAt = DateTime.UtcNow;
            issue.Status = "Nowe";
            return await _issueRepository.AddAsync(issue);
        }

        public async Task UpdateIssueAsync(Issue issue)
        {
            await _issueRepository.UpdateAsync(issue);
        }

        public async Task DeleteIssueAsync(Guid id)
        {
            await _issueRepository.DeleteAsync(id);
        }
    }
}
