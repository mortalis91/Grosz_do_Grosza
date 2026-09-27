using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Categories;

public sealed class CategoryRule : AggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid CategoryId { get; private set; }
    public int Priority { get; private set; }
    public bool IsEnabled { get; private set; }
    public string ConditionType { get; private set; } = string.Empty;
    public string ConditionValue { get; private set; } = string.Empty;
    public string? AmountOperator { get; private set; }
    public decimal? AmountValue { get; private set; }
    public string? CounterpartyValue { get; private set; }

    private CategoryRule()
    {
    }

    public CategoryRule(
        Guid userId,
        Guid categoryId,
        int priority,
        bool isEnabled,
        string conditionType,
        string conditionValue,
        string? amountOperator = null,
        decimal? amountValue = null,
        string? counterpartyValue = null)
    {
        UserId = userId;
        CategoryId = categoryId;
        Priority = priority;
        IsEnabled = isEnabled;
        ConditionType = conditionType;
        ConditionValue = conditionValue;
        AmountOperator = amountOperator;
        AmountValue = amountValue;
        CounterpartyValue = counterpartyValue;
    }
}
