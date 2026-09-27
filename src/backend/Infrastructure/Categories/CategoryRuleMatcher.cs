using System.Text.RegularExpressions;
using GroszDoGrosza.Application.Categories.Abstractions;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Domain.Transactions;

namespace GroszDoGrosza.Infrastructure.Categories;

public sealed class CategoryRuleMatcher : ICategoryRuleMatcher
{
    public Guid? MatchCategoryId(Transaction transaction, IReadOnlyList<CategoryRule> rules)
    {
        foreach (var rule in rules
                     .Where(x => x.IsEnabled)
                     .OrderByDescending(x => x.Priority))
        {
            if (IsMatch(transaction, rule))
            {
                return rule.CategoryId;
            }
        }

        return null;
    }

    private static bool IsMatch(Transaction transaction, CategoryRule rule)
    {
        var haystack = string.Join(' ', new[]
        {
            transaction.Description,
            transaction.CounterpartyName,
            transaction.Merchant,
            transaction.Iban,
            transaction.CounterpartyAccount
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

        return rule.ConditionType.ToLowerInvariant() switch
        {
            "contains" => haystack.Contains(rule.ConditionValue, StringComparison.OrdinalIgnoreCase),
            "startswith" => haystack.StartsWith(rule.ConditionValue, StringComparison.OrdinalIgnoreCase),
            "regex" => Regex.IsMatch(haystack, rule.ConditionValue, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant),
            "amount>" => rule.AmountValue.HasValue && transaction.Amount > rule.AmountValue.Value,
            "amount<" => rule.AmountValue.HasValue && transaction.Amount < rule.AmountValue.Value,
            "iban" => !string.IsNullOrWhiteSpace(transaction.Iban) &&
                     transaction.Iban.Contains(rule.ConditionValue, StringComparison.OrdinalIgnoreCase),
            "kontrahent" => !string.IsNullOrWhiteSpace(transaction.CounterpartyName) &&
                           transaction.CounterpartyName.Contains(rule.ConditionValue, StringComparison.OrdinalIgnoreCase),
            _ => false
        };
    }
}
