using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Investments;

public sealed class InvestmentTransaction : AggregateRoot
{
    public Guid InvestmentAccountId { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public string TransactionType { get; private set; } = string.Empty;
    public string? Symbol { get; private set; }
    public decimal? Quantity { get; private set; }
    public decimal? Price { get; private set; }
    public decimal? Fees { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public string Description { get; private set; } = string.Empty;
    public string? ExternalTransactionId { get; private set; }

    private InvestmentTransaction()
    {
    }
}
