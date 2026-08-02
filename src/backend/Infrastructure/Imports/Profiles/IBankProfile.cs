using GroszDoGrosza.Domain.Imports;

namespace GroszDoGrosza.Infrastructure.Imports.Profiles;

public interface IBankProfile
{
    string Name { get; }
    bool CanHandle(IEnumerable<string> headers);
    RawTransaction Map(Dictionary<string, string> row);
}
