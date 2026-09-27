using GroszDoGrosza.Application.Categories.Models;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GroszDoGrosza.Api.Security;
using Microsoft.AspNetCore.Authorization;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/category-rules")]
public sealed class CategoryRulesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public CategoryRulesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryRuleListItem>>> GetAll([FromQuery] Guid? userId, CancellationToken cancellationToken)
    {
        var query = _dbContext.CategoryRules.AsNoTracking();
        if (userId.HasValue)
        {
            query = query.Where(x => x.UserId == userId.Value);
        }

        var items = await query
            .OrderByDescending(x => x.Priority)
            .Select(x => new CategoryRuleListItem(x.Id, x.UserId, x.CategoryId, x.Priority, x.IsEnabled, x.ConditionType, x.ConditionValue, x.AmountOperator, x.AmountValue, x.CounterpartyValue))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryRuleListItem>> Create([FromBody] CategoryRuleUpsertRequest request, CancellationToken cancellationToken)
    {
        var rule = new CategoryRule(request.UserId, request.CategoryId, request.Priority, request.IsEnabled, request.ConditionType, request.ConditionValue, request.AmountOperator, request.AmountValue, request.CounterpartyValue);
        _dbContext.CategoryRules.Add(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = new CategoryRuleListItem(rule.Id, rule.UserId, rule.CategoryId, rule.Priority, rule.IsEnabled, rule.ConditionType, rule.ConditionValue, rule.AmountOperator, rule.AmountValue, rule.CounterpartyValue);
        return CreatedAtAction(nameof(GetById), new { id = rule.Id }, result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryRuleListItem>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _dbContext.CategoryRules.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new CategoryRuleListItem(x.Id, x.UserId, x.CategoryId, x.Priority, x.IsEnabled, x.ConditionType, x.ConditionValue, x.AmountOperator, x.AmountValue, x.CounterpartyValue))
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CategoryRuleUpsertRequest request, CancellationToken cancellationToken)
    {
        var rule = await _dbContext.CategoryRules.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (rule is null)
        {
            return NotFound();
        }

        _dbContext.Entry(rule).CurrentValues.SetValues(new
        {
            rule.Id,
            request.UserId,
            request.CategoryId,
            request.Priority,
            request.IsEnabled,
            request.ConditionType,
            request.ConditionValue,
            request.AmountOperator,
            request.AmountValue,
            request.CounterpartyValue
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var rule = await _dbContext.CategoryRules.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (rule is null) return NotFound();
        _dbContext.CategoryRules.Remove(rule);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
