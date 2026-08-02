using GroszDoGrosza.Domain.Users;

namespace GroszDoGrosza.Application.Auth.Abstractions;

public interface IJwtTokenService
{
    (string token, DateTimeOffset expiresAt) CreateToken(User user);
}
