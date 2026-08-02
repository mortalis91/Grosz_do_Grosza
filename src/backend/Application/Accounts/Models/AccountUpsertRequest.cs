namespace GroszDoGrosza.Application.Accounts.Models;

public sealed record AccountUpsertRequest(
    Guid UserId,
    string Name,
    string AccountType,
    string Currency,
    decimal CurrentBalance = 0,
    string? ExternalAccountId = null);
