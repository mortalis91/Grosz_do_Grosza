using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Transactions;

public sealed class Transaction : AggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }
    public DateTimeOffset? BookedAt { get; private set; }
    public decimal Amount { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public string Direction { get; private set; } = string.Empty;
    public string Status { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? CounterpartyName { get; private set; }
    public string? CounterpartyAccount { get; private set; }
    public string? Iban { get; private set; }
    public string? Merchant { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string TransactionType { get; private set; } = string.Empty;
    public bool IsSplit { get; private set; }
    public bool IsReconciled { get; private set; }
    public string? ReferenceNumber { get; private set; }
    public string? ExternalTransactionId { get; private set; }
    public Guid? RefundTransactionId { get; private set; }

    private Transaction()
    {
    }

    public Transaction(
        Guid userId,
        Guid accountId,
        DateTimeOffset occurredAt,
        DateTimeOffset? bookedAt,
        decimal amount,
        string currency,
        string direction,
        string status,
        string description,
        string? counterpartyName,
        string? counterpartyAccount,
        string? iban,
        string? merchant,
        Guid? categoryId,
        string transactionType,
        string? referenceNumber,
        string? externalTransactionId)
    {
        UserId = userId;
        AccountId = accountId;
        OccurredAt = occurredAt;
        BookedAt = bookedAt;
        Amount = amount;
        Currency = currency;
        Direction = direction;
        Status = status;
        Description = description;
        CounterpartyName = counterpartyName;
        CounterpartyAccount = counterpartyAccount;
        Iban = iban;
        Merchant = merchant;
        CategoryId = categoryId;
        TransactionType = transactionType;
        ReferenceNumber = referenceNumber;
        ExternalTransactionId = externalTransactionId;
    }
}
