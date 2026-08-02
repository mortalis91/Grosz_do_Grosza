namespace GroszDoGrosza.Application.Auth.Models;

public sealed record LoginRequest(
    string Email,
    string Password);
