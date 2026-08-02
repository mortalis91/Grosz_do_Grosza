namespace GroszDoGrosza.Application.Categories.Models;

public sealed record CategoryRuleUpsertRequest(
    Guid UserId,
    Guid CategoryId,
    int Priority,
    bool IsEnabled,
    string ConditionType,
    string ConditionValue,
    string? AmountOperator = null,
    decimal? AmountValue = null,
    string? CounterpartyValue = null);
