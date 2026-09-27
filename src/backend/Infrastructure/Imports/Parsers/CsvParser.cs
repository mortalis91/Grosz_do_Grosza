using System.Text;

namespace GroszDoGrosza.Infrastructure.Imports.Parsers;

public sealed class CsvParser : ICsvParser
{
    public async Task<(IReadOnlyList<string> Headers, IReadOnlyList<Dictionary<string, string>> Rows)> ParseAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var lines = new List<string>();
        while (await reader.ReadLineAsync(cancellationToken) is { } line)
            if (!string.IsNullOrWhiteSpace(line)) lines.Add(line);
        if (lines.Count == 0) return (Array.Empty<string>(), Array.Empty<Dictionary<string, string>>());
        var headers = Split(lines[0]);
        var rows = lines.Skip(1).Select(line => Split(line).Select((value, index) => new { value, index }).ToDictionary(x => headers.ElementAtOrDefault(x.index) ?? $"Column{x.index + 1}", x => x.value, StringComparer.OrdinalIgnoreCase)).ToList();
        return (headers, rows);
    }

    private static IReadOnlyList<string> Split(string line) => line.Split(';').Length > 1 ? line.Split(';').Select(x => x.Trim().Trim('"')).ToArray() : line.Split(',').Select(x => x.Trim().Trim('"')).ToArray();
}
