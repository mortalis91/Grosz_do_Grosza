using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Budgets;

public sealed class BudgetItem : AggregateRoot
{
    public BudgetItem(Guid budgetId, Guid categoryId, decimal plannedAmount, string? comment) { BudgetId = budgetId; CategoryId = categoryId; PlannedAmount = plannedAmount; Comment = comment; }
    public Guid BudgetId { get; private set; }
    public Guid CategoryId { get; private set; }
    public decimal PlannedAmount { get; private set; }
    public string? Comment { get; private set; }
    public decimal? AlertThresholdPercent { get; private set; }

    private BudgetItem()
    {
    }
}
