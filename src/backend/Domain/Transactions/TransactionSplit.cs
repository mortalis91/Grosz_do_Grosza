using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Transactions;

public sealed class TransactionSplit : AggregateRoot
{
    public Guid TransactionId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public decimal Amount { get; private set; }
    public string Memo { get; private set; } = string.Empty;
    private TransactionSplit() { }
    public TransactionSplit(Guid transactionId, Guid? categoryId, decimal amount, string memo)
    { TransactionId = transactionId; CategoryId = categoryId; Amount = amount; Memo = memo; }
}
