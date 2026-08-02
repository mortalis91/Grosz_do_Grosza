namespace GroszDoGrosza.Infrastructure.Imports.Parsers;

public interface ICsvParser
{
    Task<(IReadOnlyList<string> Headers, IReadOnlyList<Dictionary<string, string>> Rows)> ParseAsync(Stream stream, CancellationToken cancellationToken = default);
}
