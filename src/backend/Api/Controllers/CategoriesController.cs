using GroszDoGrosza.Application.Categories.Models;
using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/categories")]
public sealed class CategoriesController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public CategoriesController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CategoryListItem>>> GetAll(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var query = _dbContext.Categories.AsNoTracking();
        query = query.Where(x => x.UserId == userId.Value);

        var items = await query
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .Select(x => new CategoryListItem(x.Id, x.UserId, x.ParentId, x.Name, x.Color, x.Icon, x.SortOrder, x.IsSystem, x.IsArchived))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<CategoryListItem>> Create([FromBody] CategoryUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var category = new Category(userId.Value, request.ParentId, request.Name, request.Color, request.Icon, request.SortOrder, request.IsSystem);
        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = new CategoryListItem(category.Id, category.UserId, category.ParentId, category.Name, category.Color, category.Icon, category.SortOrder, category.IsSystem, category.IsArchived);
        return CreatedAtAction(nameof(GetById), new { id = category.Id }, result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CategoryListItem>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var item = await _dbContext.Categories.AsNoTracking()
            .Where(x => x.Id == id && x.UserId == userId.Value)
            .Select(x => new CategoryListItem(x.Id, x.UserId, x.ParentId, x.Name, x.Color, x.Icon, x.SortOrder, x.IsSystem, x.IsArchived))
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CategoryUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (category is null || category.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Entry(category).CurrentValues.SetValues(new
        {
            category.Id,
            category.UserId,
            request.ParentId,
            request.Name,
            request.Color,
            request.Icon,
            request.SortOrder,
            request.IsSystem,
            category.IsArchived
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var category = await _dbContext.Categories.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (category is null || category.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Entry(category).Property(x => x.IsArchived).CurrentValue = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
