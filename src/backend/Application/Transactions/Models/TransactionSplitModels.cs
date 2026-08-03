namespace GroszDoGrosza.Application.Transactions.Models;
public sealed record TransactionSplitItem(Guid Id, Guid? CategoryId, decimal Amount, string Memo);
public sealed record TransactionSplitRequest(IReadOnlyList<TransactionSplitInput> Items);
public sealed record TransactionSplitInput(Guid? CategoryId, decimal Amount, string Memo);
