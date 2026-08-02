using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Subscriptions;

public sealed class Subscription : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Merchant { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string Frequency { get; private set; } = string.Empty;
    public decimal ExpectedAmount { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public DateOnly? NextOccurrenceAt { get; private set; }
    public bool IsActive { get; private set; }

    private Subscription()
    {
    }
}
