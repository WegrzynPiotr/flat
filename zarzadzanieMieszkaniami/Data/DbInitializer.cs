using Core.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace zarzadzanieMieszkaniami.Data
{
    public static class DbInitializer
    {
        public static async Task InitializeRoles(IServiceProvider serviceProvider)
        {
            var roleManager = serviceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = serviceProvider.GetRequiredService<UserManager<User>>();

            // Definiujemy role dokładnie tak jak są w bazie danych
            string[] roleNames = { "Wlasciciel", "Najemca", "Serwisant" };

            foreach (var roleName in roleNames)
            {
                var roleExist = await roleManager.RoleExistsAsync(roleName);
                if (!roleExist)
                {
                    Console.WriteLine($"Creating role: {roleName}");
                    var result = await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                    if (result.Succeeded)
                    {
                        Console.WriteLine($"✓ Role {roleName} created successfully");
                    }
                    else
                    {
                        Console.WriteLine($"✗ Failed to create role {roleName}: {string.Join(", ", result.Errors.Select(e => e.Description))}");
                    }
                }
                else
                {
                    Console.WriteLine($"✓ Role {roleName} already exists");
                }
            }
        }
    }
}
