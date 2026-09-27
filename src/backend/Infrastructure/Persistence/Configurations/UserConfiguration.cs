using GroszDoGrosza.Domain.Users;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Email).HasMaxLength(256).IsRequired();
        builder.Property(x => x.DisplayName).HasMaxLength(256).IsRequired();
        builder.Property(x => x.DefaultCurrency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.PasswordHash).HasMaxLength(512).IsRequired();
        builder.HasIndex(x => x.Email).IsUnique();
    }
}
