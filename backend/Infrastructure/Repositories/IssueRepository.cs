using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class IssueRepository : IIssueRepository
    {
        private readonly AppDbContext _context;

        public IssueRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Issue> GetByIdAsync(Guid id)
        {
            return await _context.Issues
                .Include(i => i.Property)
                .Include(i => i.ReportedBy)
                .Include(i => i.AssignedServicemen)
                    .ThenInclude(ais => ais.Serviceman)
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task<IEnumerable<Issue>> GetAllAsync()
        {
            Console.WriteLine($"=== GETTING ALL ISSUES FROM DB ===");
            Console.WriteLine($"Total issues in context before query: {_context.Issues.Count()}");
            
            // Pobierz wszystkie issues bez Include - aby uniknąć problemów z brakującymi relacjami
            var result = await _context.Issues
                .OrderByDescending(i => i.ReportedAt)
                .ToListAsync();
            
            // Załaduj relacje osobno dla istniejących rekordów
            foreach (var issue in result)
            {
                if (issue.PropertyId != Guid.Empty)
                {
                    await _context.Entry(issue)
                        .Reference(i => i.Property)
                        .LoadAsync();
                }
                
                if (issue.ReportedById != Guid.Empty)
                {
                    await _context.Entry(issue)
                        .Reference(i => i.ReportedBy)
                        .LoadAsync();
                }
                
                // Załaduj przypisanych serwisantów
                await _context.Entry(issue)
                    .Collection(i => i.AssignedServicemen)
                    .LoadAsync();
                
                // Załaduj dane serwisantów
                if (issue.AssignedServicemen != null)
                {
                    foreach (var assignedServiceman in issue.AssignedServicemen)
                    {
                        await _context.Entry(assignedServiceman)
                            .Reference(ais => ais.Serviceman)
                            .LoadAsync();
                    }
                }
            }
            
            Console.WriteLine($"Query returned {result.Count} issues");
            foreach (var issue in result)
            {
                Console.WriteLine($"  - {issue.Id}: {issue.Title}, Photos: {issue.Photos?.Count ?? 0}");
            }
            
            return result;
        }

        public async Task<IEnumerable<Issue>> GetByPropertyIdAsync(Guid propertyId)
        {
            return await _context.Issues
                .Where(i => i.PropertyId == propertyId)
                .Include(i => i.ReportedBy)
                .ToListAsync();
        }

        public async Task<IEnumerable<Issue>> GetByUserIdAsync(Guid userId)
        {
            return await _context.Issues
                .Where(i => i.ReportedById == userId)
                .Include(i => i.Property)
                .ToListAsync();
        }

        public async Task<Issue> AddAsync(Issue issue)
        {
            Console.WriteLine($"=== ADDING ISSUE TO DB ===");
            Console.WriteLine($"Issue ID: {issue.Id}");
            Console.WriteLine($"Title: {issue.Title}");
            Console.WriteLine($"ReportedById: {issue.ReportedById}");
            Console.WriteLine($"Photos count: {issue.Photos?.Count ?? 0}");
            
            await _context.Issues.AddAsync(issue);
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"Issue saved. Total issues in context: {_context.Issues.Count()}");
            
            return issue;
        }

        public async Task UpdateAsync(Issue issue)
        {
            _context.Issues.Update(issue);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var issue = await GetByIdAsync(id);
            if (issue != null)
            {
                _context.Issues.Remove(issue);
                await _context.SaveChangesAsync();
            }
        }
    }
}
