using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Users;

public sealed class User : AggregateRoot
{
    public string Email { get; private set; } = string.Empty;
    public string DisplayName { get; private set; } = string.Empty;
    public string DefaultCurrency { get; private set; } = "PLN";
    public string PasswordHash { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;

    private User()
    {
    }

    public User(string email, string displayName, string defaultCurrency, string passwordHash)
    {
        Email = email;
        DisplayName = displayName;
        DefaultCurrency = defaultCurrency;
        PasswordHash = passwordHash;
    }
}
