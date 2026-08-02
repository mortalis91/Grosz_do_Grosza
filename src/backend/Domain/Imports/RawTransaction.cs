namespace GroszDoGrosza.Domain.Imports;

public sealed class RawTransaction
{
    public DateOnly BookingDate { get; init; }
    public DateOnly? OperationDate { get; init; }
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "";
    public string Description { get; init; } = "";
    public string Counterparty { get; init; } = "";
    public string AccountNumber { get; init; } = "";
    public string ExternalId { get; init; } = "";
    public Dictionary<string, string> AdditionalFields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}
