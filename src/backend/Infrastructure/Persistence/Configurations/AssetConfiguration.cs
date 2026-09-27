using GroszDoGrosza.Domain.Assets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class AssetConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.ToTable("Assets");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(256).IsRequired();
        builder.Property(x => x.AssetType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.CurrentValue).HasPrecision(18, 2);
    }
}
