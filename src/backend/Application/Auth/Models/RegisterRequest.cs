namespace GroszDoGrosza.Application.Auth.Models;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string DisplayName,
    string DefaultCurrency = "PLN");
