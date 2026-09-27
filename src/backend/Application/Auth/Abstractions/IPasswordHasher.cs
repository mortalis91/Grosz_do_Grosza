namespace GroszDoGrosza.Application.Auth.Abstractions;

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool Verify(string password, string passwordHash);
}
