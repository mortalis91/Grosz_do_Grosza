using GroszDoGrosza.Domain.Imports;
using System.Text.RegularExpressions;

namespace GroszDoGrosza.Infrastructure.Imports.Mapping;

public sealed class TransactionMapper
{
    public NormalizedTransaction Map(RawTransaction raw)
    {
        var description = Regex.Replace(raw.Description.Trim(), "\\s+", " ");
        return new NormalizedTransaction { Date = raw.OperationDate ?? raw.BookingDate, Amount = raw.Amount, Currency = raw.Currency.Trim().ToUpperInvariant(), Description = description, Merchant = description.Split(new[] { '-', '—', '|' }, StringSplitOptions.RemoveEmptyEntries)[0].Trim(), AccountNumber = raw.AccountNumber.Trim(), ExternalId = raw.ExternalId.Trim() };
    }
}
