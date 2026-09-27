using GroszDoGrosza.Infrastructure.Imports.Profiles;

namespace GroszDoGrosza.Infrastructure.Imports.Detection;

public sealed class UnsupportedBankException(string message) : Exception(message);

public sealed class BankDetector(IEnumerable<IBankProfile> profiles)
{
    // Dodanie nowego banku wymaga rejestracji kolejnego profilu, bez zmiany detektora.
    public IBankProfile Detect(IEnumerable<string> headers) => profiles.FirstOrDefault(profile => profile.CanHandle(headers)) ?? throw new UnsupportedBankException("Nie rozpoznano banku na podstawie nagłówków CSV.");
}
