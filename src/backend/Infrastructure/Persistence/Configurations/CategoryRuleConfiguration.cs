using GroszDoGrosza.Domain.Categories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace GroszDoGrosza.Infrastructure.Persistence.Configurations;

public sealed class CategoryRuleConfiguration : IEntityTypeConfiguration<CategoryRule>
{
    public void Configure(EntityTypeBuilder<CategoryRule> builder)
    {
        builder.ToTable("CategoryRules");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.ConditionType).HasMaxLength(64).IsRequired();
        builder.Property(x => x.ConditionValue).HasMaxLength(256).IsRequired();
        builder.Property(x => x.AmountOperator).HasMaxLength(16);
        builder.Property(x => x.CounterpartyValue).HasMaxLength(256);
        builder.HasIndex(x => new { x.UserId, x.IsEnabled, x.Priority });
    }
}
