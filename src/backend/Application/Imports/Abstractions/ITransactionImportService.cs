using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Application.Imports.Abstractions;

public interface ITransactionImportService
{
    Task<ImportCommandResult> ImportAsync(
        Guid userId,
        Guid accountId,
        string fileName,
        Stream stream,
        IReadOnlyDictionary<string, string>? categoryMapping = null,
        CancellationToken cancellationToken = default);
}
