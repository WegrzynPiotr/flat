using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Core.Interfaces;
using Core.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Application.Services
{
    public class AuthService
    {
        private readonly UserManager<User> _userManager;
        private readonly IRefreshTokenRepository _refreshTokenRepository;
        private readonly JwtService _jwtService;
        private readonly IConfiguration _configuration;

        public AuthService(
            UserManager<User> userManager,
            IRefreshTokenRepository refreshTokenRepository,
            JwtService jwtService,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _refreshTokenRepository = refreshTokenRepository;
            _jwtService = jwtService;
            _configuration = configuration;
        }

        public async Task<User> RegisterAsync(string email, string password, string firstName, string lastName, string role)
        {
            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email.ToLower().Trim(),
                FirstName = firstName.Trim(),
                LastName = lastName.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, password);
            
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new Exception($"Registration failed: {errors}");
            }

            // Dodaj rolę
            if (!string.IsNullOrEmpty(role))
            {
                await _userManager.AddToRoleAsync(user, role);
            }

            return user;
        }

        public async Task<(string AccessToken, string RefreshToken, User User)> LoginAsync(string email, string password)
        {
            Console.WriteLine($"=== LOGIN ATTEMPT: {email} ===");
            
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                Console.WriteLine("User not found");
                throw new Exception("Invalid email or password");
            }
            
            Console.WriteLine($"User found: {user.Id} - {user.FirstName} {user.LastName}");
            
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, password);
            
            if (!isPasswordValid)
            {
                Console.WriteLine("Password verification failed");
                throw new Exception("Invalid email or password");
            }
            
            Console.WriteLine("Password verified successfully");

            var accessToken = _jwtService.GenerateAccessToken(user);
            var refreshToken = _jwtService.GenerateRefreshToken();

            var refreshTokenExpirationDays = int.Parse(_configuration["JwtSettings:RefreshTokenExpirationDays"]);

            var refreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false
            };

            await _refreshTokenRepository.AddAsync(refreshTokenEntity);
            Console.WriteLine("Refresh token saved");

            return (accessToken, refreshToken, user);
        }

        public async Task<(string AccessToken, string RefreshToken)> RefreshTokenAsync(string refreshToken)
        {
            var tokenEntity = await _refreshTokenRepository.GetByTokenAsync(refreshToken);

            if (tokenEntity == null || tokenEntity.IsRevoked || tokenEntity.ExpiresAt < DateTime.UtcNow)
            {
                throw new Exception("Invalid or expired refresh token");
            }

            var user = tokenEntity.User;
            var newAccessToken = _jwtService.GenerateAccessToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken();

            tokenEntity.IsRevoked = true;
            await _refreshTokenRepository.UpdateAsync(tokenEntity);

            var refreshTokenExpirationDays = int.Parse(_configuration["JwtSettings:RefreshTokenExpirationDays"]);

            var newRefreshTokenEntity = new RefreshToken
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Token = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
                CreatedAt = DateTime.UtcNow,
                IsRevoked = false
            };

            await _refreshTokenRepository.AddAsync(newRefreshTokenEntity);

            return (newAccessToken, newRefreshToken);
        }

        public async Task<bool> LogoutAsync(string refreshToken)
        {
            var tokenEntity = await _refreshTokenRepository.GetByTokenAsync(refreshToken);
            if (tokenEntity == null)
            {
                return false;
            }

            tokenEntity.IsRevoked = true;
            await _refreshTokenRepository.UpdateAsync(tokenEntity);
            return true;
        }

        public async Task RevokeAllUserTokensAsync(Guid userId)
        {
            var tokens = await _refreshTokenRepository.GetAllByUserIdAsync(userId);
            foreach (var token in tokens)
            {
                if (!token.IsRevoked)
                {
                    token.IsRevoked = true;
                    await _refreshTokenRepository.UpdateAsync(token);
                }
            }
        }
    }
}
