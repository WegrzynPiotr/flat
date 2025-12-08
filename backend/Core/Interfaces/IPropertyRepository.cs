using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Core.Models;

namespace Core.Interfaces
{
    public interface IPropertyRepository
    {
        Task<Property> GetByIdAsync(Guid id);
        Task<IEnumerable<Property>> GetAllAsync();
        Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId);
        Task<Property> AddAsync(Property property);
        Task UpdateAsync(Property property);
        Task DeleteAsync(Guid id);
    }
}
