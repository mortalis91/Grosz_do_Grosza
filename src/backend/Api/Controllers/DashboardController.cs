using GroszDoGrosza.Application.Dashboard.Models;
using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public DashboardController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetSummary([FromQuery] int? year, [FromQuery] int? month, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var transactions = _dbContext.Transactions.AsNoTracking().Where(x => x.UserId == userId.Value);
        if (year.HasValue) transactions = transactions.Where(x => x.OccurredAt.Year == year.Value);
        if (month.HasValue) transactions = transactions.Where(x => x.OccurredAt.Month == month.Value);

        var recentTransactions = await transactions
            .OrderByDescending(x => x.OccurredAt)
            .Take(10)
            .Select(x => new DashboardTransactionItem(
                x.Id,
                x.OccurredAt,
                x.CounterpartyName ?? x.Description,
                x.Amount,
                x.Currency,
                x.CategoryId != null ? "Kategoria" : "Bez kategorii",
                x.TransactionType))
            .ToListAsync(cancellationToken);

        var spendingByCategory = await transactions
            .Where(x => x.Amount < 0 && x.Status != "Ignored")
            .GroupBy(x => x.CategoryId)
            .Select(x => new { CategoryId = x.Key, Amount = -x.Sum(y => y.Amount) })
            .ToListAsync(cancellationToken);
        var categoryNames = await _dbContext.Categories.AsNoTracking()
            .Where(x => x.UserId == userId.Value)
            .ToDictionaryAsync(x => x.Id, x => x.Name, cancellationToken);
        var spending = spendingByCategory
            .Select(x => new DashboardSpendingItem(
                x.CategoryId.HasValue && categoryNames.TryGetValue(x.CategoryId.Value, out var name) ? name : "Bez kategorii",
                x.Amount,
                0m))
            .ToList();
        var spendingTotal = spending.Sum(x => x.Amount);
        var topSpendingCategories = spending
            .OrderByDescending(x => x.Amount)
            .Take(5)
            .Select(x => x with { Percentage = spendingTotal == 0 ? 0 : x.Amount / spendingTotal * 100m })
            .ToList();

        var accounts = await _dbContext.Accounts.AsNoTracking()
            .Where(x => x.UserId == userId.Value && !x.IsArchived)
            .Select(x => new { x.CurrentBalance, x.Currency })
            .ToListAsync(cancellationToken);

        var balance = accounts.Sum(x => x.CurrentBalance * GetPlnRate(x.Currency));

        var income = await transactions
            .Where(x => x.Amount > 0 && x.Status != "Ignored")
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        var expenses = await transactions
            .Where(x => x.Amount < 0 && x.Status != "Ignored")
            .SumAsync(x => (decimal?)x.Amount, cancellationToken) ?? 0m;

        return Ok(new DashboardSummaryResponse(balance, income, expenses, balance, recentTransactions, topSpendingCategories));
    }

    private decimal GetPlnRate(string currency)
    {
        if (currency.Equals("PLN", StringComparison.OrdinalIgnoreCase)) return 1m;
        return decimal.TryParse(
            HttpContext.RequestServices.GetRequiredService<IConfiguration>()[$"ExchangeRates:{currency.ToUpperInvariant()}"]
            , NumberStyles.Number, CultureInfo.InvariantCulture
        , out var rate) && rate > 0 ? rate : 1m;
    }
}
