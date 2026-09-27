using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Imports;

public sealed class ImportBatch : AggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid AccountId { get; private set; }
    public string SourceType { get; private set; } = string.Empty;
    public string SourceFileName { get; private set; } = string.Empty;
    public string SourceHash { get; private set; } = string.Empty;
    public string Status { get; private set; } = "Pending";
    public int ImportedRowsCount { get; private set; }
    public int CreatedRowsCount { get; private set; }
    public int SkippedRowsCount { get; private set; }
    public int DuplicateRowsCount { get; private set; }
    public int FailedRowsCount { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? FinishedAt { get; private set; }

    private ImportBatch()
    {
    }

    public ImportBatch(Guid userId, Guid accountId, string sourceType, string sourceFileName, string sourceHash)
    {
        UserId = userId;
        AccountId = accountId;
        SourceType = sourceType;
        SourceFileName = sourceFileName;
        SourceHash = sourceHash;
        Status = "Completed";
        StartedAt = DateTimeOffset.UtcNow;
        FinishedAt = DateTimeOffset.UtcNow;
    }

    public void MarkCompleted(int importedRowsCount, int createdRowsCount, int skippedRowsCount, int duplicateRowsCount, int failedRowsCount)
    {
        ImportedRowsCount = importedRowsCount;
        CreatedRowsCount = createdRowsCount;
        SkippedRowsCount = skippedRowsCount;
        DuplicateRowsCount = duplicateRowsCount;
        FailedRowsCount = failedRowsCount;
        Status = "Completed";
        FinishedAt = DateTimeOffset.UtcNow;
    }

    public void MarkFailed()
    {
        Status = "Failed";
        FinishedAt = DateTimeOffset.UtcNow;
    }
}
