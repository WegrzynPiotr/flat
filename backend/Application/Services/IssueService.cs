using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;

namespace Application.Services
{
    public class IssueService
    {
        private readonly IIssueRepository _issueRepository;

        public IssueService(IIssueRepository issueRepository)
        {
            _issueRepository = issueRepository;
        }

        public async Task<IEnumerable<Issue>> GetAllIssuesAsync()
        {
            return await _issueRepository.GetAllAsync();
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
