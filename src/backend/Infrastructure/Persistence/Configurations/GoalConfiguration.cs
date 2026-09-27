using GroszDoGrosza.Domain.Goals;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class GoalConfiguration : IEntityTypeConfiguration<Goal>
{
    public void Configure(EntityTypeBuilder<Goal> builder)
    {
        builder.ToTable("Goals");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Currency).HasMaxLength(3).IsRequired();
        builder.Property(x => x.Status).HasMaxLength(32).IsRequired();
    }
}
