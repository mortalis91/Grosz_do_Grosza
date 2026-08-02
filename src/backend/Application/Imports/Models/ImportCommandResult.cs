namespace GroszDoGrosza.Application.Imports.Models;

public sealed record ImportCommandResult(
    Guid ImportBatchId,
    int ImportedRows,
    int CreatedTransactions,
    int DuplicateRows,
    int FailedRows);
