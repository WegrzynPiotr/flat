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
            var properties = await _propertyRepository.GetAllAsync();
            var dtos = properties.Select(p => new PropertyResponse
            {
                Id = p.Id,
                Address = p.Address,
                City = p.City,
                PostalCode = p.PostalCode,
                RoomsCount = p.RoomsCount,
                Area = p.Area,
                OwnerId = p.OwnerId,
                CurrentTenantId = p.CurrentTenantId,
                CreatedAt = p.CreatedAt
            }).ToList();
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
                CurrentTenantId = property.CurrentTenantId,
                CreatedAt = property.CreatedAt
            };

            return Ok(dto);
        }

        [HttpPost]
        [Authorize(Roles = "Administrator")]
        public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
            
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
                CurrentTenantId = created.CurrentTenantId,
                CreatedAt = created.CreatedAt
            };
            
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, dto);
        }
    }
}
