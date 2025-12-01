using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Core.Models;

namespace Core.Interfaces
{
    public interface IIssueRepository
    {
        Task<Issue> GetByIdAsync(Guid id);
        Task<IEnumerable<Issue>> GetAllAsync();
        Task<IEnumerable<Issue>> GetByPropertyIdAsync(Guid propertyId);
        Task<IEnumerable<Issue>> GetByUserIdAsync(Guid userId);
        Task<Issue> AddAsync(Issue issue);
        Task UpdateAsync(Issue issue);
        Task DeleteAsync(Guid id);
    }
}
