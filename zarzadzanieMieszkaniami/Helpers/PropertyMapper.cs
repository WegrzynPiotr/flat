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

            // Sprawdź czy użytkownik ma najem (aktywny lub wygasły)
            bool isActiveTenant = false;
            bool isOwner = userId.HasValue && property.OwnerId == userId.Value;
            bool isTenant = false; // jakikolwiek najem (aktywny lub wygasły)
            var now = DateTime.UtcNow;
            PropertyTenant? userTenancy = null;
            
            if (userId.HasValue)
            {
                userTenancy = (property.Tenants ?? new List<PropertyTenant>())
                    .FirstOrDefault(pt => pt.TenantId == userId.Value);
                
                if (userTenancy != null)
                {
                    isTenant = true;
                    // Aktywny najem: StartDate <= teraz <= EndDate (lub EndDate null)
                    isActiveTenant = userTenancy.StartDate <= now && 
                                    (userTenancy.EndDate == null || userTenancy.EndDate >= now);
                }
            }

            // Lista najemców:
            // - Właściciel widzi wszystkich najemców
            // - Aktywny najemca widzi wszystkich najemców
            // - Były najemca widzi TYLKO siebie (swoją wygasłą umowę)
            var tenantsToShow = new List<TenantInfo>();
            if (isOwner || isActiveTenant)
            {
                // Właściciel i aktywni najemcy widzą wszystkich
                tenantsToShow = (property.Tenants ?? new List<PropertyTenant>()).Select(pt => new TenantInfo
                {
                    TenantId = pt.TenantId,
                    TenantName = TextHelper.CapitalizeName(pt.Tenant.FirstName, pt.Tenant.LastName),
                    StartDate = pt.StartDate,
                    EndDate = pt.EndDate
                }).ToList();
            }
            else if (isTenant && userTenancy != null)
            {
                // Były najemca widzi tylko swoją umowę
                tenantsToShow = new List<TenantInfo>
                {
                    new TenantInfo
                    {
                        TenantId = userTenancy.TenantId,
                        TenantName = TextHelper.CapitalizeName(userTenancy.Tenant?.FirstName, userTenancy.Tenant?.LastName),
                        StartDate = userTenancy.StartDate,
                        EndDate = userTenancy.EndDate
                    }
                };
            }

            return new PropertyResponse
            {
                Id = property.Id,
                Address = TextHelper.Capitalize(property.Address),
                City = TextHelper.Capitalize(property.City),
                PostalCode = property.PostalCode,
                RoomsCount = property.RoomsCount,
                Area = property.Area,
                Latitude = property.Latitude,
                Longitude = property.Longitude,
                Description = property.Description,
                OwnerId = property.OwnerId,
                Owner = property.Owner != null ? new OwnerInfo
                {
                    Id = property.Owner.Id,
                    Name = TextHelper.CapitalizeName(property.Owner.FirstName, property.Owner.LastName),
                    Email = property.Owner.Email,
                    PhoneNumber = property.Owner.PhoneNumber
                } : null,
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
                Tenants = tenantsToShow,
                CreatedAt = property.CreatedAt,
                IsActiveTenant = isActiveTenant
            };
        }
    }
}
