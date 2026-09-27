using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Infrastructure.Imports;

public sealed class ImportDeduplicationService : IImportDeduplicationService
{
    public Task<IReadOnlyList<ImportedTransactionDraft>> FilterDuplicatesAsync(
        Guid accountId,
        IReadOnlyList<ImportedTransactionDraft> drafts,
        CancellationToken cancellationToken = default)
    {
        var unique = drafts
            .GroupBy(x => x.SourceRowHash, StringComparer.OrdinalIgnoreCase)
            .Select(x => x.First())
            .ToList()
            .AsReadOnly();

        return Task.FromResult<IReadOnlyList<ImportedTransactionDraft>>(unique);
    }
}
