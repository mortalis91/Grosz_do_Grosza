using GroszDoGrosza.Domain.Tags;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("Tags");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(128).IsRequired();
        builder.Property(x => x.Color).HasMaxLength(32);
        builder.HasIndex(x => new { x.UserId, x.Name }).IsUnique();
    }
}
