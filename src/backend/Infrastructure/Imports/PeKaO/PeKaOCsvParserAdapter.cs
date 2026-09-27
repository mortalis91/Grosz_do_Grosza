using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Infrastructure.Imports.PeKaO;

public sealed class PeKaOCsvParserAdapter : ITransactionImportParser
{
    private readonly GroszDoGrosza.Application.Imports.PeKaO.PeKaOCsvParser _parser = new();

    public bool CanParse(string fileName, Stream stream) => _parser.CanParse(fileName, stream);

    public Task<ImportResult> ParseAsync(Stream stream, CancellationToken cancellationToken = default)
        => _parser.ParseAsync(stream, cancellationToken);
}
