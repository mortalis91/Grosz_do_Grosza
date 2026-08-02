namespace GroszDoGrosza.Application.Categories.Models;

public sealed record CategoryRuleListItem(
    Guid Id,
    Guid UserId,
    Guid CategoryId,
    int Priority,
    bool IsEnabled,
    string ConditionType,
    string ConditionValue,
    string? AmountOperator,
    decimal? AmountValue,
    string? CounterpartyValue);
