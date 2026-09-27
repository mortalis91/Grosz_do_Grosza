using FluentAssertions;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Domain.Transactions;
using GroszDoGrosza.Infrastructure.Categories;

namespace GroszDoGrosza.Application.Tests.Categories;

public sealed class CategoryRuleMatcherTests
{
    [Fact]
    public void MatchCategoryId_should_match_contains_rule()
    {
        var matcher = new CategoryRuleMatcher();
        var categoryId = Guid.NewGuid();
        var rules = new[]
        {
            new CategoryRule(Guid.NewGuid(), categoryId, 10, true, "contains", "ORLEN")
        };
        var transaction = new Transaction(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, null, -50m, "PLN", "Expense", "Imported", "Tankowanie ORLEN", "ORLEN", null, null, null, null, "CARD", null, "HASH");

        var result = matcher.MatchCategoryId(transaction, rules);

        result.Should().Be(categoryId);
    }

    [Fact]
    public void MatchCategoryId_should_match_highest_priority_enabled_rule()
    {
        var matcher = new CategoryRuleMatcher();
        var lowId = Guid.NewGuid();
        var highId = Guid.NewGuid();
        var rules = new[]
        {
            new CategoryRule(Guid.NewGuid(), lowId, 1, true, "contains", "ALLEGRO"),
            new CategoryRule(Guid.NewGuid(), highId, 99, true, "contains", "ALLEGRO")
        };
        var transaction = new Transaction(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, null, -50m, "PLN", "Expense", "Imported", "Zakup ALLEGRO", "ALLEGRO", null, null, null, null, "CARD", null, "HASH");

        var result = matcher.MatchCategoryId(transaction, rules);

        result.Should().Be(highId);
    }

    [Fact]
    public void MatchCategoryId_should_return_null_when_no_rule_matches()
    {
        var matcher = new CategoryRuleMatcher();
        var rules = new[]
        {
            new CategoryRule(Guid.NewGuid(), Guid.NewGuid(), 10, true, "contains", "XYZ")
        };
        var transaction = new Transaction(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow, null, -50m, "PLN", "Expense", "Imported", "Tankowanie", "ORLEN", null, null, null, null, "CARD", null, "HASH");

        var result = matcher.MatchCategoryId(transaction, rules);

        result.Should().BeNull();
    }
}
