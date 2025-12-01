using System.Threading.Tasks;
using Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace zarzadzanieMieszkaniami.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var user = await _authService.RegisterAsync(
                    request.Email,
                    request.Password,
                    request.FirstName,
                    request.LastName,
                    request.Role
                );

                return Ok(new
                {
                    message = "User registered successfully",
                    user = new
                    {
                        user.Id,
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        user.Role,
                        user.PhoneNumber,
                        user.CreatedAt
                    }
                });
            }
            catch (System.Exception ex)
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

                return Ok(new
                {
                    accessToken,
                    refreshToken,
                    user = new
                    {
                        user.Id,
                        user.Email,
                        user.FirstName,
                        user.LastName,
                        user.Role,
                        user.PhoneNumber,
                        user.CreatedAt
                    }
                });
            }
            catch (System.Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var (accessToken, refreshToken) = await _authService.RefreshTokenAsync(request.RefreshToken);

                return Ok(new
                {
                    accessToken,
                    refreshToken
                });
            }
            catch (System.Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }
    }

    //  DTOs musz¹ byæ POZA klas¹ AuthController, ale WEWN¥TRZ namespace
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
}
