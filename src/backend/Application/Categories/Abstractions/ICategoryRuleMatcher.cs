using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Domain.Transactions;

namespace GroszDoGrosza.Application.Categories.Abstractions;

public interface ICategoryRuleMatcher
{
    Guid? MatchCategoryId(Transaction transaction, IReadOnlyList<CategoryRule> rules);
}
