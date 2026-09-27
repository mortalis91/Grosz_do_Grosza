using GroszDoGrosza.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class ImportBatchConfiguration : IEntityTypeConfiguration<ImportBatch>
{
    public void Configure(EntityTypeBuilder<ImportBatch> builder)
    {
        builder.ToTable("ImportBatches");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.SourceType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.SourceFileName).HasMaxLength(512).IsRequired();
        builder.Property(x => x.SourceHash).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.UserId, x.AccountId, x.SourceHash }).IsUnique();
    }
}
