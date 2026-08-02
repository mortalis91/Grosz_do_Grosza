using GroszDoGrosza.Domain.Transactions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Direction).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.CounterpartyName).HasMaxLength(256);
        builder.Property(x => x.CounterpartyAccount).HasMaxLength(64);
        builder.Property(x => x.Iban).HasMaxLength(34);
        builder.Property(x => x.Merchant).HasMaxLength(256);
        builder.Property(x => x.TransactionType).HasMaxLength(128).IsRequired();
        builder.Property(x => x.ReferenceNumber).HasMaxLength(128);
        builder.Property(x => x.ExternalTransactionId).HasMaxLength(128);
        builder.HasIndex(x => new { x.UserId, x.AccountId, x.OccurredAt });
        builder.HasIndex(x => new { x.UserId, x.CategoryId, x.OccurredAt });
        builder.HasIndex(x => new { x.UserId, x.ExternalTransactionId });
    }
}
