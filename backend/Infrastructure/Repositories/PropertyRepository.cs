using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class PropertyRepository : IPropertyRepository
    {
        private readonly AppDbContext _context;

        public PropertyRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Property> GetByIdAsync(Guid id)
        {
            return await _context.Properties
                .Include(p => p.Owner)
                .Include(p => p.Tenants)
                    .ThenInclude(pt => pt.Tenant)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<Property>> GetAllAsync()
        {
            return await _context.Properties
                .Include(p => p.Owner)
                .Include(p => p.Tenants)
                    .ThenInclude(pt => pt.Tenant)
                .ToListAsync();
        }

        public async Task<IEnumerable<Property>> GetByOwnerIdAsync(Guid ownerId)
        {
            Console.WriteLine($"🔵 PropertyRepository.GetByOwnerIdAsync for owner: {ownerId}");
            
            var properties = await _context.Properties
                .Include(p => p.Owner)
                .Include(p => p.Tenants)
                    .ThenInclude(pt => pt.Tenant)
                .Where(p => p.OwnerId == ownerId)
                .ToListAsync();
            
            Console.WriteLine($"🔵 PropertyRepository found {properties.Count} properties");
            foreach (var prop in properties)
            {
                Console.WriteLine($"  - {prop.Address} (ID: {prop.Id})");
            }
            
            return properties;
        }

        public async Task<IEnumerable<Property>> GetByTenantIdAsync(Guid tenantId)
        {
            Console.WriteLine($"🔵 PropertyRepository.GetByTenantIdAsync for tenant: {tenantId}");
            
            var properties = await _context.Properties
                .Include(p => p.Owner)
                .Include(p => p.Tenants)
                    .ThenInclude(pt => pt.Tenant)
                .Where(p => p.Tenants.Any(pt => pt.TenantId == tenantId))
                .ToListAsync();
            
            Console.WriteLine($"🔵 PropertyRepository found {properties.Count} properties for tenant");
            foreach (var prop in properties)
            {
                Console.WriteLine($"  - {prop.Address} (ID: {prop.Id})");
            }
            
            return properties;
        }

        public async Task<Property> AddAsync(Property property)
        {
            Console.WriteLine($"🔵 PropertyRepository.AddAsync: {property.Address} for owner {property.OwnerId}");
            
            await _context.Properties.AddAsync(property);
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"🟢 Property saved with ID: {property.Id}");
            
            return property;
        }

        public async Task UpdateAsync(Property property)
        {
            _context.Properties.Update(property);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Guid id)
        {
            var property = await GetByIdAsync(id);
            if (property != null)
            {
                _context.Properties.Remove(property);
                await _context.SaveChangesAsync();
            }
        }
    }
}
