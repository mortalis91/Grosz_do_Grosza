using GroszDoGrosza.Domain.Categories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Color).HasMaxLength(32);
        builder.Property(x => x.Icon).HasMaxLength(64);
        builder.HasIndex(x => new { x.UserId, x.ParentId });
    }
}
