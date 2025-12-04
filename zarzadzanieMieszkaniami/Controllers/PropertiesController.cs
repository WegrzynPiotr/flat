using System;
using System.Threading.Tasks;
using System.Linq;
using System.Security.Claims;
using Core.Interfaces;
using Core.Models;
using Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PropertiesController : ControllerBase
    {
        private readonly IPropertyRepository _propertyRepository;

        public PropertiesController(IPropertyRepository propertyRepository)
        {
            _propertyRepository = propertyRepository;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            
            Console.WriteLine($"🔵 GetAll properties for user: {userId}, role: {userRole}");
            
            IEnumerable<Property> properties;
            
            if (userRole == "Wlasciciel")
            {
                // Właściciel widzi swoje mieszkania
                properties = await _propertyRepository.GetByOwnerIdAsync(userId);
            }
            else if (userRole == "Najemca")
            {
                // Najemca widzi mieszkania do których jest przypisany
                properties = await _propertyRepository.GetByTenantIdAsync(userId);
            }
            else
            {
                // Serwisant lub inna rola - brak mieszkań
                properties = new List<Property>();
            }
            
            Console.WriteLine($"🔵 Found {properties.Count()} properties");
            
            var dtos = properties.Select(p => new PropertyResponse
            {
                Id = p.Id,
                Address = p.Address,
                City = p.City,
                PostalCode = p.PostalCode,
                RoomsCount = p.RoomsCount,
                Area = p.Area,
                OwnerId = p.OwnerId,
                Tenants = (p.Tenants ?? new List<PropertyTenant>()).Select(pt => new TenantInfo
                {
                    TenantId = pt.TenantId,
                    TenantName = pt.Tenant.FirstName + " " + pt.Tenant.LastName,
                    StartDate = pt.StartDate,
                    EndDate = pt.EndDate
                }).ToList(),
                CreatedAt = p.CreatedAt
            }).ToList();
            
            Console.WriteLine($"🔵 Returning {dtos.Count} properties");
            
            return Ok(dtos);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetById(Guid id)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            var dto = new PropertyResponse
            {
                Id = property.Id,
                Address = property.Address,
                City = property.City,
                PostalCode = property.PostalCode,
                RoomsCount = property.RoomsCount,
                Area = property.Area,
                OwnerId = property.OwnerId,
                Tenants = property.Tenants.Select(pt => new TenantInfo
                {
                    TenantId = pt.TenantId,
                    TenantName = pt.Tenant.FirstName + " " + pt.Tenant.LastName,
                    StartDate = pt.StartDate,
                    EndDate = pt.EndDate
                }).ToList(),
                CreatedAt = property.CreatedAt
            };

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Roles = "Wlasciciel")]
        public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request)
        {
            Console.WriteLine("🔵 POST /properties called");
            Console.WriteLine($"🔵 User claims: {string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}"))}");
            
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
            Console.WriteLine($"🔵 Creating property for user: {userId}");
            
            var property = new Property
            {
                Id = Guid.NewGuid(),
                Address = request.Address,
                City = request.City,
                PostalCode = request.PostalCode,
                RoomsCount = request.RoomsCount,
                Area = request.Area,
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow
            };
            
            var created = await _propertyRepository.AddAsync(property);
            
            var dto = new PropertyResponse
            {
                Id = created.Id,
                Address = created.Address,
                City = created.City,
                PostalCode = created.PostalCode,
                RoomsCount = created.RoomsCount,
                Area = created.Area,
                OwnerId = created.OwnerId,
                Tenants = new List<TenantInfo>(),
                CreatedAt = created.CreatedAt
            };
            
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, dto);
        }
    }
}
