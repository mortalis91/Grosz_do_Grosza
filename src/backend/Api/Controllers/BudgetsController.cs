using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Domain.Budgets;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Api.Controllers;

[ApiController, Authorize, Route("api/v1/budgets")]
public sealed class BudgetsController : ControllerBase
{
    private readonly AppDbContext db;
    public BudgetsController(AppDbContext db) => this.db = db;

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] DateOnly? month, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var start = month ?? new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var end = start.AddMonths(1).AddDays(-1);
        var startUtc = new DateTimeOffset(start.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var endUtc = new DateTimeOffset(start.AddMonths(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var result = await db.Budgets.Where(x => x.UserId == userId.Value && x.StartDate == start).SelectMany(x => db.BudgetItems.Where(i => i.BudgetId == x.Id).Select(i => new { i.Id, i.BudgetId, i.CategoryId, i.PlannedAmount, i.Comment, x.StartDate, x.Currency, ActualAmount = -db.Transactions.Where(t => t.UserId == userId.Value && t.CategoryId == i.CategoryId && t.OccurredAt >= startUtc && t.OccurredAt < endUtc && t.Amount < 0 && t.Status != "Ignored").Sum(t => (decimal?)t.Amount) ?? 0m })).ToListAsync(ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBudgetRequest request, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        if (request.CategoryId == Guid.Empty || request.Amount <= 0) return BadRequest("Kategoria i kwota są wymagane.");
        var start = new DateOnly(request.Year, request.Month, 1);
        var budget = await db.Budgets.FirstOrDefaultAsync(x => x.UserId == userId.Value && x.StartDate == start, ct);
        if (budget is null) { budget = new Budget(userId.Value, $"Budżet {start:yyyy-MM}", "Monthly", start, start.AddMonths(1).AddDays(-1), request.Currency); db.Budgets.Add(budget); }
        var item = await db.BudgetItems.FirstOrDefaultAsync(x => x.BudgetId == budget.Id && x.CategoryId == request.CategoryId, ct);
        if (item is null) db.BudgetItems.Add(new BudgetItem(budget.Id, request.CategoryId, request.Amount, request.Comment));
        else { db.Entry(item).Property(x => x.PlannedAmount).CurrentValue = request.Amount; db.Entry(item).Property(x => x.Comment).CurrentValue = request.Comment; }
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpDelete("items/{id:guid}")]
    public async Task<IActionResult> DeleteItem(Guid id, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var item = await db.BudgetItems.Join(db.Budgets, i => i.BudgetId, b => b.Id, (i, b) => new { Item = i, Budget = b }).FirstOrDefaultAsync(x => x.Item.Id == id && x.Budget.UserId == userId.Value, ct);
        if (item is null) return NotFound();
        db.BudgetItems.Remove(item.Item);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public sealed record CreateBudgetRequest(Guid CategoryId, decimal Amount, string Currency, int Year, int Month, string? Comment);
