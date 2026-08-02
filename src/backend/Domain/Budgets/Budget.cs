using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Budgets;

public sealed class Budget : AggregateRoot
{
    public Budget(Guid userId, string name, string periodType, DateOnly startDate, DateOnly endDate, string currency)
    {
        UserId = userId; Name = name; PeriodType = periodType; StartDate = startDate; EndDate = endDate; Currency = currency; IsActive = true;
    }
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string PeriodType { get; private set; } = string.Empty;
    public DateOnly StartDate { get; private set; }
    public DateOnly EndDate { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public bool IsActive { get; private set; }

    private Budget()
    {
    }
}
