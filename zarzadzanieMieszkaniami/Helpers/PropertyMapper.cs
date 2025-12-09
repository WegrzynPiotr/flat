using System;
using System.Linq;
using System.Collections.Generic;
using System.Text.Json;
using Core.Models;
using Application.DTOs;
using Microsoft.AspNetCore.Http;
using zarzadzanieMieszkaniami.Controllers;

namespace zarzadzanieMieszkaniami.Helpers
{
    public static class PropertyMapper
    {
        public static PropertyResponse ToResponse(Property property, HttpRequest request, Guid? userId = null)
        {
            // Parse documents
            var documents = string.IsNullOrEmpty(property.Documents)
                ? new List<PropertyDocumentDto>()
                : JsonSerializer.Deserialize<List<PropertyDocumentDto>>(property.Documents);

            // Sprawdź czy użytkownik ma aktywny najem
            bool isActiveTenant = false;
            if (userId.HasValue)
            {
                var tenancy = (property.Tenants ?? new List<PropertyTenant>())
                    .FirstOrDefault(pt => pt.TenantId == userId.Value);
                
                if (tenancy != null)
                {
                    var now = DateTime.UtcNow;
                    // Aktywny najem: StartDate <= teraz <= EndDate (lub EndDate null)
                    isActiveTenant = tenancy.StartDate <= now && 
                                    (tenancy.EndDate == null || tenancy.EndDate >= now);
                }
            }

            return new PropertyResponse
            {
                Id = property.Id,
                Address = property.Address,
                City = property.City,
                PostalCode = property.PostalCode,
                RoomsCount = property.RoomsCount,
                Area = property.Area,
                Latitude = property.Latitude,
                Longitude = property.Longitude,
                Description = property.Description,
                OwnerId = property.OwnerId,
                Photos = string.IsNullOrEmpty(property.Photos)
                    ? new List<string>()
                    : JsonSerializer.Deserialize<List<string>>(property.Photos)!
                        .Select(filename => $"{request.Scheme}://{request.Host}/uploads/properties/{filename}")
                        .ToList(),
                Documents = documents.Select(d => new PropertyDocumentInfo
                {
                    Filename = d.Filename,
                    OriginalName = d.OriginalName,
                    UploadedAt = d.UploadedAt,
                    Url = $"{request.Scheme}://{request.Host}/uploads/documents/{d.Filename}"
                }).ToList(),
                Tenants = (property.Tenants ?? new List<PropertyTenant>()).Select(pt => new TenantInfo
                {
                    TenantId = pt.TenantId,
                    TenantName = pt.Tenant.FirstName + " " + pt.Tenant.LastName,
                    StartDate = pt.StartDate,
                    EndDate = pt.EndDate
                }).ToList(),
                CreatedAt = property.CreatedAt,
                IsActiveTenant = isActiveTenant
            };
        }
    }
}
