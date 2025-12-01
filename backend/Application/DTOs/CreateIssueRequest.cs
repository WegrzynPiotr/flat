using System;
using System.Collections.Generic;

namespace Application.DTOs
{
    public class CreateIssueRequest
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public string Priority { get; set; }
        public Guid PropertyId { get; set; }
        public List<string> Photos { get; set; } = new List<string>();
    }
}
