namespace GroszDoGrosza.Application.Imports.Models;

public sealed record ImportedTransactionDraft(
    DateOnly BookingDate,
    DateOnly ValueDate,
    string CounterpartyName,
    string? CounterpartyAddress,
    string? SourceAccount,
    string? TargetAccount,
    string Title,
    decimal Amount,
    string Currency,
    string? ReferenceNumber,
    string TransactionType,
    string Category,
    string SourceRowHash);
