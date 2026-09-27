using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Application.Imports.Models;

namespace GroszDoGrosza.Application.Imports.PeKaO;

public sealed class PeKaOCsvParser : ITransactionImportParser
{
    public bool CanParse(string fileName, Stream stream)
    {
        return Path.GetExtension(fileName).Equals(".csv", StringComparison.OrdinalIgnoreCase);
    }

    public async Task<ImportResult> ParseAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        var originalPosition = stream.CanSeek ? stream.Position : 0;
        var encodings = new[]
        {
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: false),
            Encoding.GetEncoding("Windows-1250")
        };

        foreach (var encoding in encodings)
        {
            if (stream.CanSeek)
            {
                stream.Position = originalPosition;
            }

            using var reader = new StreamReader(stream, encoding, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            var parsed = await TryParseWithReaderAsync(reader, cancellationToken);
            if (parsed is not null)
            {
                return parsed;
            }
        }

        return new ImportResult(0, 0, 0, 0, Array.Empty<ImportedTransactionDraft>());
    }

    private static async Task<ImportResult?> TryParseWithReaderAsync(StreamReader reader, CancellationToken cancellationToken)
    {
        var headerLine = await reader.ReadLineAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(headerLine))
        {
            return null;
        }

        var headers = SplitRow(headerLine);
        if (!headers.Any(x => NormalizeHeader(x).Equals(PeKaOCsvColumnNames.BookingDate, StringComparison.OrdinalIgnoreCase)))
        {
            return null;
        }

        var headerIndex = headers
            .Select((value, index) => new { value = NormalizeHeader(value), index })
            .ToDictionary(x => x.value, x => x.index, StringComparer.OrdinalIgnoreCase);

        var items = new List<ImportedTransactionDraft>();
        var totalRows = 0;
        var parsedRows = 0;
        var skippedRows = 0;

        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var line = await reader.ReadLineAsync(cancellationToken);
            if (line is null)
            {
                break;
            }

            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            totalRows++;
            var columns = SplitRow(line);
            if (columns.Count < headers.Count)
            {
                skippedRows++;
                continue;
            }

            if (!TryParseRow(columns, headerIndex, out var draft))
            {
                skippedRows++;
                continue;
            }

            items.Add(draft);
            parsedRows++;
        }

        return new ImportResult(totalRows, parsedRows, skippedRows, 0, items);
    }

    private static bool TryParseRow(IReadOnlyList<string> columns, IReadOnlyDictionary<string, int> headerIndex, out ImportedTransactionDraft draft)
    {
        draft = default!;

        if (!TryGet(columns, headerIndex, PeKaOCsvColumnNames.BookingDate, out var bookingDateRaw) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.ValueDate, out var valueDateRaw) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.CounterpartyName, out var counterpartyName) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.Title, out var title) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.Amount, out var amountRaw) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.Currency, out var currency) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.TransactionType, out var transactionType) ||
            !TryGet(columns, headerIndex, PeKaOCsvColumnNames.Category, out var category))
        {
            return false;
        }

        if (!DateOnly.TryParseExact(bookingDateRaw, "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var bookingDate))
        {
            return false;
        }

        if (!DateOnly.TryParseExact(valueDateRaw, "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var valueDate))
        {
            valueDate = bookingDate;
        }

        if (!TryParseDecimal(amountRaw, out var amount))
        {
            return false;
        }

        var sourceRowHash = CreateHash(string.Join('|', columns));
        draft = new ImportedTransactionDraft(
            bookingDate,
            valueDate,
            counterpartyName.Trim(),
            TryGet(columns, headerIndex, PeKaOCsvColumnNames.CounterpartyAddress, out var address) ? NormalizeOptional(address) : null,
            TryGet(columns, headerIndex, PeKaOCsvColumnNames.SourceAccount, out var sourceAccount) ? NormalizeOptional(sourceAccount) : null,
            TryGet(columns, headerIndex, PeKaOCsvColumnNames.TargetAccount, out var targetAccount) ? NormalizeOptional(targetAccount) : null,
            title.Trim(),
            amount,
            currency.Trim().ToUpperInvariant(),
            TryGet(columns, headerIndex, PeKaOCsvColumnNames.ReferenceNumber, out var referenceNumber) ? NormalizeOptional(referenceNumber) : null,
            transactionType.Trim(),
            category.Trim(),
            sourceRowHash);

        return true;
    }

    private static bool TryGet(IReadOnlyList<string> columns, IReadOnlyDictionary<string, int> headerIndex, string header, out string value)
    {
        value = string.Empty;
        if (!headerIndex.TryGetValue(NormalizeHeader(header), out var index) || index < 0 || index >= columns.Count)
        {
            return false;
        }

        value = columns[index].Trim().Trim('\'');
        return true;
    }

    private static bool TryParseDecimal(string raw, out decimal value)
    {
        raw = raw.Replace(" ", string.Empty).Trim();
        return decimal.TryParse(raw, NumberStyles.Number | NumberStyles.AllowLeadingSign, new CultureInfo("pl-PL"), out value);
    }

    private static string NormalizeHeader(string header)
    {
        return header.Trim().Trim('\uFEFF');
    }

    private static string NormalizeOptional(string value)
    {
        value = value.Trim().Trim('\'');
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value;
    }

    private static IReadOnlyList<string> SplitRow(string line)
    {
        var values = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                inQuotes = !inQuotes;
                continue;
            }

            if (ch == ';' && !inQuotes)
            {
                values.Add(current.ToString());
                current.Clear();
                continue;
            }

            current.Append(ch);
        }

        values.Add(current.ToString());
        return values;
    }

    private static string CreateHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes);
    }
}
