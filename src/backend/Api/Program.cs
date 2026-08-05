using GroszDoGrosza.Infrastructure;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GroszDoGrosza API",
        Version = "v1",
        Description = "API for the Grosz do Grosza personal finance manager."
    });
    // Request/response DTOs are kept in separate feature namespaces and may
    // share a short class name. Full names prevent schema ID collisions.
    options.CustomSchemaIds(type => type.FullName?.Replace("+", ".") ?? type.Name);
    options.ResolveConflictingActions(descriptions => descriptions.First());
});
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://127.0.0.1:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? "dev-only-change-me-dev-only-change-me";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "GroszDoGrosza";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "GroszDoGrosza";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
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
            IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

// Swagger is useful for the locally hosted API regardless of the ASP.NET
// environment selected by the launch command.
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "GroszDoGrosza API v1");
    options.RoutePrefix = "swagger";
});


using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<GroszDoGrosza.Infrastructure.Persistence.AppDbContext>();
    dbContext.Database.Migrate();
}

app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapControllers();

app.Run();
