using GroszDoGrosza.Domain.Imports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class ImportLogConfiguration : IEntityTypeConfiguration<ImportLog>
{
    public void Configure(EntityTypeBuilder<ImportLog> builder)
    {
        builder.ToTable("ImportLogs");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Level).HasMaxLength(32).IsRequired();
        builder.Property(x => x.Message).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.RawPayload).HasMaxLength(4000);
        builder.HasIndex(x => new { x.ImportBatchId, x.RowNumber });
    }
}
