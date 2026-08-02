using GroszDoGrosza.Domain.Budgets;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class BudgetItemConfiguration : IEntityTypeConfiguration<BudgetItem>
{
    public void Configure(EntityTypeBuilder<BudgetItem> builder)
    {
        builder.ToTable("BudgetItems");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.PlannedAmount).HasPrecision(18, 2);
        builder.Property(x => x.Comment).HasMaxLength(160);
        builder.Property(x => x.AlertThresholdPercent).HasPrecision(5, 2);
        builder.HasIndex(x => new { x.BudgetId, x.CategoryId }).IsUnique();
    }
}
