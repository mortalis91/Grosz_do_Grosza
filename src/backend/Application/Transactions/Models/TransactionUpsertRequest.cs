namespace GroszDoGrosza.Application.Transactions.Models;

public sealed record TransactionUpsertRequest(
    Guid UserId,
    Guid AccountId,
    DateTimeOffset OccurredAt,
    DateTimeOffset? BookedAt,
    decimal Amount,
    string Currency,
    string Direction,
    string Status,
    string Description,
    string? CounterpartyName,
    string? CounterpartyAccount,
    string? Iban,
    string? Merchant,
    Guid? CategoryId,
    string TransactionType,
    string? ReferenceNumber = null,
    string? ExternalTransactionId = null);
