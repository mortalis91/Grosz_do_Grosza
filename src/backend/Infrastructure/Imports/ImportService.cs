using GroszDoGrosza.Application.Imports;
using GroszDoGrosza.Domain.Imports;
using GroszDoGrosza.Infrastructure.Imports.Detection;
using GroszDoGrosza.Infrastructure.Imports.Mapping;
using GroszDoGrosza.Infrastructure.Imports.Parsers;

namespace GroszDoGrosza.Infrastructure.Imports;

public sealed class ImportService(ICsvParser parser, BankDetector detector, TransactionMapper mapper) : IImportService
{
    // Wspólny pipeline importu: CSV -> profil banku -> model surowy -> model znormalizowany.
    public async Task<IReadOnlyList<NormalizedTransaction>> ImportAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        // Parser nie zna banku; zwraca wyłącznie nagłówki i słowniki pól.
        var parsed = await parser.ParseAsync(stream, cancellationToken);
        // Detector wybiera strategię mapowania na podstawie nagłówków pliku.
        var profile = detector.Detect(parsed.Headers);
        var result = new List<NormalizedTransaction>(parsed.Rows.Count);
        foreach (var row in parsed.Rows)
        {
            // Profil banku mapuje wartości bankowe do wspólnego RawTransaction.
            var raw = profile.Map(row);
            // Mapper normalizuje opis, walutę, datę i dane kontrahenta.
            if (raw.Amount == 0 || string.IsNullOrWhiteSpace(raw.Description)) continue;
            result.Add(mapper.Map(raw));
        }
        return result;
    }
}
