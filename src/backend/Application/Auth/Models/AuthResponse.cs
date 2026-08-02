namespace GroszDoGrosza.Application.Auth.Models;

public sealed record AuthResponse(
    Guid UserId,
    string Email,
    string DisplayName,
    string AccessToken,
    DateTimeOffset ExpiresAt);
