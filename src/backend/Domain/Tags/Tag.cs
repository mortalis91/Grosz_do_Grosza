using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Tags;

public sealed class Tag : AggregateRoot
{
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Color { get; private set; }

    private Tag()
    {
    }
}
