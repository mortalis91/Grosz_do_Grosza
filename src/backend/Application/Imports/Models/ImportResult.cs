namespace GroszDoGrosza.Application.Imports.Models;

public sealed record ImportResult(
    int TotalRows,
    int ParsedRows,
    int SkippedRows,
    int DuplicateRows,
    IReadOnlyList<ImportedTransactionDraft> Items);
