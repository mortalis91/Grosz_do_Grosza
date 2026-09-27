using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Application.Imports.Abstractions;

public interface ITransactionImportParser
{
    bool CanParse(string fileName, Stream stream);
    Task<ImportResult> ParseAsync(Stream stream, CancellationToken cancellationToken = default);
}
