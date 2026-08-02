using System.Globalization;
using GroszDoGrosza.Domain.Imports;

namespace GroszDoGrosza.Infrastructure.Imports.Profiles;

public abstract class HeaderBankProfile : IBankProfile
{
    public abstract string Name { get; }
    protected abstract string DateHeader { get; }
    public abstract bool CanHandle(IEnumerable<string> headers);
    public RawTransaction Map(Dictionary<string, string> row)
    {
        var date = ParseDate(Get(row, DateHeader));
        var amount = decimal.Parse(Get(row, "Kwota", "Amount"), NumberStyles.Any, CultureInfo.GetCultureInfo("pl-PL"));
        var description = Get(row, "Opis", "Description", "Tytuł", "Transaction Type");
        return new RawTransaction { BookingDate = date, OperationDate = date, Amount = amount, Currency = Get(row, "Waluta", "Currency", "PLN"), Description = description, Counterparty = Get(row, "Nazwa nadawcy", "Kontrahent", "Counterparty"), AccountNumber = Get(row, "Rachunek", "Account Number", "AccountNumber"), ExternalId = Get(row, "ID", "Identyfikator", "ExternalId"), AdditionalFields = row };
    }
    protected static string Get(Dictionary<string, string> row, params string[] keys) => keys.Select(key => row.FirstOrDefault(x => string.Equals(x.Key.Trim(), key, StringComparison.OrdinalIgnoreCase)).Value).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? "";
    private static DateOnly ParseDate(string value) => DateOnly.TryParse(value, CultureInfo.GetCultureInfo("pl-PL"), DateTimeStyles.None, out var date) || DateOnly.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out date) ? date : throw new FormatException($"Nieprawidłowa data: {value}");
}

public sealed class PekaoProfile : HeaderBankProfile { public override string Name => "PEKAO"; protected override string DateHeader => "Data operacji"; public override bool CanHandle(IEnumerable<string> headers) => Has(headers, "Data operacji", "Data księgowania", "Typ operacji"); private static bool Has(IEnumerable<string> h, params string[] r) => r.All(x => h.Any(y => y.Equals(x, StringComparison.OrdinalIgnoreCase))); }
public sealed class PKOProfile : HeaderBankProfile { public override string Name => "PKO"; protected override string DateHeader => "Data księgowania"; public override bool CanHandle(IEnumerable<string> h) => Has(h, "Data księgowania", "Saldo po operacji"); private static bool Has(IEnumerable<string> h, params string[] r) => r.All(x => h.Any(y => y.Equals(x, StringComparison.OrdinalIgnoreCase))); }
public sealed class INGProfile : HeaderBankProfile { public override string Name => "ING"; protected override string DateHeader => "Booking Date"; public override bool CanHandle(IEnumerable<string> h) => Has(h, "Booking Date", "Transaction Type"); private static bool Has(IEnumerable<string> h, params string[] r) => r.All(x => h.Any(y => y.Equals(x, StringComparison.OrdinalIgnoreCase))); }
public sealed class MillenniumProfile : HeaderBankProfile { public override string Name => "Millennium"; protected override string DateHeader => "Data operacji"; public override bool CanHandle(IEnumerable<string> h) => Has(h, "Data operacji", "Kanał"); private static bool Has(IEnumerable<string> h, params string[] r) => r.All(x => h.Any(y => y.Equals(x, StringComparison.OrdinalIgnoreCase))); }
public sealed class SantanderProfile : HeaderBankProfile { public override string Name => "Santander"; protected override string DateHeader => "Data księgowania"; public override bool CanHandle(IEnumerable<string> h) => Has(h, "Data księgowania", "Nazwa nadawcy"); private static bool Has(IEnumerable<string> h, params string[] r) => r.All(x => h.Any(y => y.Equals(x, StringComparison.OrdinalIgnoreCase))); }
