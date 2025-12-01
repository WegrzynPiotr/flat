using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Http;

namespace Application.DTOs
{
    public class CreateIssueRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public Guid PropertyId { get; set; }
        public List<IFormFile>? Photos { get; set; }
    }
}
