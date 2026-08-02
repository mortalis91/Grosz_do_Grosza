using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Goals;

public sealed class Goal : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public decimal TargetAmount { get; private set; }
    public decimal CurrentAmount { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public DateOnly? TargetDate { get; private set; }
    public string Status { get; private set; } = string.Empty;

    private Goal()
    {
    }
}
