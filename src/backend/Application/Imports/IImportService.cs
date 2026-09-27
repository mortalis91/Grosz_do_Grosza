using GroszDoGrosza.Domain.Imports;

namespace GroszDoGrosza.Application.Imports;

public interface IImportService
{
    Task<IReadOnlyList<NormalizedTransaction>> ImportAsync(Stream stream, CancellationToken cancellationToken = default);
}
