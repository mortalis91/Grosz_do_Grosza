using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GroszDoGrosza.Application.Auth.Abstractions;
using GroszDoGrosza.Domain.Users;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace GroszDoGrosza.Infrastructure.Auth;

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public (string token, DateTimeOffset expiresAt) CreateToken(User user)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "GroszDoGrosza";
        var audience = _configuration["Jwt:Audience"] ?? "GroszDoGrosza";
        var key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT key is missing.");
        var expiresAt = DateTimeOffset.UtcNow.AddHours(8);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim("userId", user.Id.ToString())
        };

        var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
