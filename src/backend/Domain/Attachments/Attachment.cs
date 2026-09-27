using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Attachments;

public sealed class Attachment : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public string StoragePath { get; private set; } = string.Empty;
    public long FileSize { get; private set; }
    public string? Checksum { get; private set; }

    private Attachment()
    {
    }
}
