using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Audit;

public sealed class AuditLog : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string EntityName { get; private set; } = string.Empty;
    public string EntityId { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string? BeforeJson { get; private set; }
    public string? AfterJson { get; private set; }
    public string? CorrelationId { get; private set; }
    public DateTimeOffset OccurredAt { get; private set; }

    private AuditLog()
    {
    }
}
