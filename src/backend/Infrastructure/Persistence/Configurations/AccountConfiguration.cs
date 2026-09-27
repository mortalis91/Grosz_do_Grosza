using GroszDoGrosza.Domain.Accounts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class AccountConfiguration : IEntityTypeConfiguration<Account>
{
    public void Configure(EntityTypeBuilder<Account> builder)
    {
        builder.ToTable("Accounts");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(256).IsRequired();
        builder.Property(x => x.AccountType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.ExternalAccountId).HasMaxLength(128);
        builder.Property(x => x.CurrentBalance).HasPrecision(18, 2);
        builder.HasIndex(x => new { x.UserId, x.AccountType });
    }
}
