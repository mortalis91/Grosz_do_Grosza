using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Assets;

public sealed class Asset : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string AssetType { get; private set; } = string.Empty;
    public decimal CurrentValue { get; private set; }
    public string Currency { get; private set; } = "PLN";
    public DateOnly? AcquiredAt { get; private set; }
    public DateOnly? DisposedAt { get; private set; }
    public bool IsActive { get; private set; }

    private Asset()
    {
    }
}
