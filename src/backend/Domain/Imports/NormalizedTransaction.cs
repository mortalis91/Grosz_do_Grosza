namespace GroszDoGrosza.Domain.Imports;

public sealed class NormalizedTransaction
{
    public DateOnly Date { get; init; }
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "";
    public string Description { get; init; } = "";
    public string Merchant { get; init; } = "";
    public string AccountNumber { get; init; } = "";
    public string ExternalId { get; init; } = "";
}
