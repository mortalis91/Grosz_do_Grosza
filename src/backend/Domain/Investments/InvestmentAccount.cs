using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Investments;

public sealed class InvestmentAccount : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? BrokerName { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public string? ExternalAccountId { get; private set; }
    public bool IsArchived { get; private set; }

    private InvestmentAccount()
    {
    }
}
