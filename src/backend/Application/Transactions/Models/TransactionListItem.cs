namespace GroszDoGrosza.Application.Transactions.Models;

public sealed record TransactionListItem(
    Guid Id,
    Guid UserId,
    Guid AccountId,
    DateTimeOffset OccurredAt,
    decimal Amount,
    string Currency,
    string Direction,
    string Status,
    string Description,
    string? CounterpartyName,
    Guid? CategoryId,
    string TransactionType,
    string? ExternalTransactionId,
    Guid? RefundTransactionId);
