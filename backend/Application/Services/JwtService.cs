using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Core.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Application.Services
{
    public class JwtService
    {
        private readonly IConfiguration _configuration;
        private readonly EncryptionService _encryptionService;
        private readonly UserManager<User> _userManager;

        public JwtService(IConfiguration configuration, EncryptionService encryptionService, UserManager<User> userManager)
        {
            _configuration = configuration;
            _encryptionService = encryptionService;
            _userManager = userManager;
        }

        public string GenerateAccessToken(User user)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"];
            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];
            var expirationMinutes = int.Parse(_configuration["JwtSettings:AccessTokenExpirationMinutes"]);

            // Używamy HMAC-SHA256 dla podpisu JWT (standard)
            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.GivenName, user.FirstName),
                new Claim(ClaimTypes.Surname, user.LastName)
            };

            // Dodaj role użytkownika do claims
            var roles = _userManager.GetRolesAsync(user).Result;
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
                Console.WriteLine($"✅ Added role to JWT: {role}");
            }

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public string GenerateRefreshToken()
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            var refreshToken = Convert.ToBase64String(randomNumber);
            
            // Zwracamy niezaszyfrowany token - szyfrowanie nastąpi przed zapisem do bazy
            return refreshToken;
        }

        /// <summary>
        /// Szyfruje refresh token używając AES-256 przed zapisem do bazy
        /// </summary>
        public string EncryptRefreshToken(string token)
        {
            return _encryptionService.Encrypt(token);
        }

        /// <summary>
        /// Deszyfruje refresh token z bazy danych
        /// </summary>
        public string DecryptRefreshToken(string encryptedToken)
        {
            return _encryptionService.Decrypt(encryptedToken);
        }

        public ClaimsPrincipal ValidateToken(string token)
        {
            var secretKey = _configuration["JwtSettings:SecretKey"];
            var issuer = _configuration["JwtSettings:Issuer"];
            var audience = _configuration["JwtSettings:Audience"];

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(secretKey);

            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = true,
                    ValidIssuer = issuer,
                    ValidateAudience = true,
                    ValidAudience = audience,
                    ValidateLifetime = false, // Dla refresh token nie sprawdzamy expiry
                    ClockSkew = TimeSpan.Zero
                }, out SecurityToken validatedToken);

                return principal;
            }
            catch
            {
                return null;
            }
        }
    }
}
