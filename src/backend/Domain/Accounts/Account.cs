using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Accounts;

public sealed class Account : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string AccountType { get; private set; } = string.Empty;
    public string Currency { get; private set; } = "PLN";
    public decimal CurrentBalance { get; private set; }
    public bool IsArchived { get; private set; }
    public string? ExternalAccountId { get; private set; }

    private Account()
    {
    }

    public Account(Guid userId, string name, string accountType, string currency, decimal currentBalance = 0, string? externalAccountId = null)
    {
        UserId = userId;
        Name = name;
        AccountType = accountType;
        Currency = currency;
        CurrentBalance = currentBalance;
        ExternalAccountId = externalAccountId;
    }
}
