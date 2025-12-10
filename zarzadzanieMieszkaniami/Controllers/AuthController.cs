using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Application.Services;
using Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using zarzadzanieMieszkaniami.Helpers;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly UserManager<User> _userManager;

        public AuthController(AuthService authService, UserManager<User> userManager)
        {
            _authService = authService;
            _userManager = userManager;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                // Tylko właściciele mogą się rejestrować
                var user = await _authService.RegisterAsync(
                    request.Email,
                    request.Password,
                    request.FirstName,
                    request.LastName,
                    "Wlasciciel" // Wymuszamy rolę Wlasciciel dla rejestracji
                );

                // Automatyczne logowanie po rejestracji
                var (accessToken, refreshToken, _) = await _authService.LoginAsync(request.Email, request.Password);
                var roles = await _userManager.GetRolesAsync(user);

                return Ok(new
                {
                    accessToken,
                    refreshToken,
                    user = new
                    {
                        user.Id,
                        user.Email,
                        firstName = TextHelper.Capitalize(user.FirstName),
                        lastName = TextHelper.Capitalize(user.LastName),
                        role = roles.FirstOrDefault()
                    }
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var (accessToken, refreshToken, user) = await _authService.LoginAsync(request.Email, request.Password);
                var roles = await _userManager.GetRolesAsync(user);
                // JWT and refresh tokens are generated inside AuthService; simply pass them through here
                return Ok(new
                {
                    accessToken,
                    refreshToken,
                    user = new
                    {
                        user.Id,
                        user.Email,
                        firstName = TextHelper.Capitalize(user.FirstName),
                        lastName = TextHelper.Capitalize(user.LastName),
                        role = roles.FirstOrDefault()
                    }
                });
            }
            catch (System.Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var (accessToken, refreshToken) = await _authService.RefreshTokenAsync(request.RefreshToken);
                return Ok(new { accessToken, refreshToken });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
        {
            try
            {
                var success = await _authService.LogoutAsync(request.RefreshToken);
                if (success)
                {
                    return Ok(new { message = "Logged out successfully" });
                }
                return BadRequest(new { message = "Invalid refresh token" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("revoke-all-tokens")]
        public async Task<IActionResult> RevokeAllTokens()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized();
                }

                var userId = Guid.Parse(userIdClaim);
                await _authService.RevokeAllUserTokensAsync(userId);
                return Ok(new { message = "All tokens revoked successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized();
                }

                var userId = Guid.Parse(userIdClaim);
                var user = await _userManager.FindByIdAsync(userId.ToString());
                
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                var roles = await _userManager.GetRolesAsync(user);

                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = TextHelper.Capitalize(user.FirstName),
                    lastName = TextHelper.Capitalize(user.LastName),
                    role = roles.FirstOrDefault()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public class RegisterRequest
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Role { get; set; }
    }

    public class LoginRequest
    {
        public required string Email { get; set; }
        public required string Password { get; set; }
    }

    public class RefreshTokenRequest
    {
        public required string RefreshToken { get; set; }
    }

    public class LogoutRequest
    {
        public required string RefreshToken { get; set; }
    }
}
