namespace GroszDoGrosza.Application.Dashboard.Models;

public sealed record DashboardSummaryResponse(
    decimal Balance,
    decimal Income,
    decimal Expenses,
    decimal NetWorth,
    IReadOnlyList<DashboardTransactionItem> RecentTransactions,
    IReadOnlyList<DashboardSpendingItem> TopSpendingCategories);

public sealed record DashboardTransactionItem(
    Guid Id,
    DateTimeOffset OccurredAt,
    string CounterpartyName,
    decimal Amount,
    string Currency,
    string CategoryName,
    string TransactionType);

public sealed record DashboardSpendingItem(
    string CategoryName,
    decimal Amount,
    decimal Percentage);
