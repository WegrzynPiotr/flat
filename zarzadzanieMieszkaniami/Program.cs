using Application.Services;
using Core.Interfaces;
using Core.Models;
using Infrastructure;
using Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using System.Security.Claims;
using System.Text;
using zarzadzanieMieszkaniami.Data;
using zarzadzanieMieszkaniami.Hubs;

var builder = WebApplication.CreateBuilder(args);

// Konfiguracja backendu
builder.WebHost.UseUrls("http://0.0.0.0:5162");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL"),
        b => b.MigrationsAssembly("zarzadzanieMieszkaniami")));

// ASP.NET Identity
builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    // Konfiguracja hasła
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    
    // Konfiguracja użytkownika
    options.User.RequireUniqueEmail = true;
    
    // Konfiguracja lockout
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddScoped<IPropertyRepository, PropertyRepository>();
builder.Services.AddScoped<IIssueRepository, IssueRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();

// Serwisy szyfrowania i JWT
builder.Services.AddSingleton<EncryptionService>();
builder.Services.AddScoped<JwtService>();

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IssueService>();

// JWT Authentication
var jwtSecretKey = builder.Configuration["JwtSettings:SecretKey"];
var jwtIssuer = builder.Configuration["JwtSettings:Issuer"];
var jwtAudience = builder.Configuration["JwtSettings:Audience"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
        RoleClaimType = ClaimTypes.Role // Ensure role claims are recognized
    };

    // SignalR authentication
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/chatHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddControllers();

builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Zezwala na WSZYSTKIE originy (ważne dla aplikacji mobilnej)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// DODAJ TO - Middleware do logowania requestów
app.Use(async (context, next) =>
{
    var timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
    var method = context.Request.Method;
    var path = context.Request.Path;
    var query = context.Request.QueryString;
    var ip = context.Connection.RemoteIpAddress?.ToString();

    Console.WriteLine($"\n{'='} REQUEST {'=',-50}");
    Console.WriteLine($"[{timestamp}] {method} {path}{query}");
    Console.WriteLine($"IP: {ip}");
    Console.WriteLine($"Headers: {string.Join(", ", context.Request.Headers.Select(h => $"{h.Key}: {h.Value}"))}");

    //  Logowanie body dla POST/PUT/PATCH
    if (method == "POST" || method == "PUT" || method == "PATCH")
    {
        context.Request.EnableBuffering();
        using var bodyReader = new StreamReader(context.Request.Body, leaveOpen: true);
        var bodyContent = await bodyReader.ReadToEndAsync();
        context.Request.Body.Position = 0; // Reset pozycji streamu

        if (!string.IsNullOrWhiteSpace(bodyContent))
        {
            Console.WriteLine($"Body: {bodyContent}");
        }
    }

    await next();

    var statusCode = context.Response.StatusCode;
    Console.WriteLine($"\n{'='} RESPONSE {'=',-50}");
    Console.WriteLine($"[{timestamp}] Status: {statusCode}");
    Console.WriteLine($"{'=',-60}\n");
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS MUSI BYĆ PRZED AUTHORIZATION!
app.UseCors("AllowAll");

app.UseStaticFiles();
app.UseAuthentication(); // Dodaję authentication przed authorization
app.UseAuthorization();
app.MapControllers();
app.MapHub<ChatHub>("/chatHub");

// Inicjalizacja ról
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        await DbInitializer.InitializeRoles(services);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error initializing roles: {ex.Message}");
    }
}

app.Run();
app.Run();
