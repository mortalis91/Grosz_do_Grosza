namespace GroszDoGrosza.Application.Common.Abstractions;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
