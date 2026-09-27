using GroszDoGrosza.Domain.Investments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class InvestmentTransactionConfiguration : IEntityTypeConfiguration<InvestmentTransaction>
{
    public void Configure(EntityTypeBuilder<InvestmentTransaction> builder)
    {
        builder.ToTable("InvestmentTransactions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TransactionType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Symbol).HasMaxLength(32);
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.Amount).HasPrecision(18, 2);
        builder.Property(x => x.Quantity).HasPrecision(18, 6);
        builder.Property(x => x.Price).HasPrecision(18, 6);
        builder.Property(x => x.Fees).HasPrecision(18, 2);
    }
}
