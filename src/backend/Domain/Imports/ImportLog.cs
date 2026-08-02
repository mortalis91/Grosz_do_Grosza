using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Imports;

public sealed class ImportLog : AggregateRoot
{
    public Guid ImportBatchId { get; private set; }
    public int RowNumber { get; private set; }
    public string Level { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    public string? RawPayload { get; private set; }

    private ImportLog()
    {
    }

    public ImportLog(Guid importBatchId, int rowNumber, string level, string message, string? rawPayload = null)
    {
        ImportBatchId = importBatchId;
        RowNumber = rowNumber;
        Level = level;
        Message = message;
        RawPayload = rawPayload;
    }
}
