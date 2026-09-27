using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Application.Imports.Abstractions;

public interface IImportDeduplicationService
{
    Task<IReadOnlyList<ImportedTransactionDraft>> FilterDuplicatesAsync(
        Guid accountId,
        IReadOnlyList<ImportedTransactionDraft> drafts,
        CancellationToken cancellationToken = default);
}
