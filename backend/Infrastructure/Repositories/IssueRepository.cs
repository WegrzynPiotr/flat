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
                .FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task<IEnumerable<Issue>> GetAllAsync()
        {
            return await _context.Issues
                .Include(i => i.Property)
                .Include(i => i.ReportedBy)
                .OrderByDescending(i => i.ReportedAt)
                .ToListAsync();
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
            await _context.Issues.AddAsync(issue);
            await _context.SaveChangesAsync();
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
