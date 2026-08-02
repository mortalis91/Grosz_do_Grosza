using GroszDoGrosza.Application.Auth.Abstractions;
using GroszDoGrosza.Application.Auth.Models;
using GroszDoGrosza.Domain.Users;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Infrastructure.Auth;

public sealed class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(AppDbContext dbContext, IPasswordHasher passwordHasher, IJwtTokenService jwtTokenService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var exists = await _dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken);
        if (exists)
        {
            throw new InvalidOperationException("Email already exists.");
        }

        var user = new User(email, request.DisplayName.Trim(), request.DefaultCurrency.Trim().ToUpperInvariant(), _passwordHasher.HashPassword(request.Password));
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var (token, expiresAt) = _jwtTokenService.CreateToken(user);
        return new AuthResponse(user.Id, user.Email, user.DisplayName, token, expiresAt);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.FirstOrDefaultAsync(x => x.Email == email, cancellationToken)
            ?? throw new InvalidOperationException("Invalid credentials.");

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid credentials.");
        }

        var (token, expiresAt) = _jwtTokenService.CreateToken(user);
        return new AuthResponse(user.Id, user.Email, user.DisplayName, token, expiresAt);
    }
}
