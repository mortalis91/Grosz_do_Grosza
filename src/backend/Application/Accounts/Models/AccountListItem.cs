namespace GroszDoGrosza.Application.Accounts.Models;

public sealed record AccountListItem(
    Guid Id,
    Guid UserId,
    string Name,
    string AccountType,
    string Currency,
    decimal CurrentBalance,
    bool IsArchived,
    string? ExternalAccountId);
