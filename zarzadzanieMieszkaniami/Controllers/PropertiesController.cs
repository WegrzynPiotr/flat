using System;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;
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
        public async Task<IActionResult> GetAll()
        {
            var properties = await _propertyRepository.GetAllAsync();
            return Ok(properties);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var property = await _propertyRepository.GetByIdAsync(id);
            if (property == null)
                return NotFound();

            return Ok(property);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Property property)
        {
            property.Id = Guid.NewGuid();
            property.CreatedAt = DateTime.UtcNow;
            var created = await _propertyRepository.AddAsync(property);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
    }
}
