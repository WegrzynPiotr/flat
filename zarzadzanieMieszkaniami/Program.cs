using Application.Services;
using Core.Interfaces;
using Infrastructure;
using Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Konfiguracja backendu
builder.WebHost.UseUrls("http://0.0.0.0:5162");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IPropertyRepository, PropertyRepository>();
builder.Services.AddScoped<IIssueRepository, IssueRepository>();
builder.Services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
builder.Services.AddScoped<JwtService>();


builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<IssueService>();

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
app.UseStaticFiles();

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

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
