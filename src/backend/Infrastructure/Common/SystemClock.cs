using GroszDoGrosza.Application.Common.Abstractions;

namespace GroszDoGrosza.Infrastructure.Common;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
