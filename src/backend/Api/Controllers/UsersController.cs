using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/user")]
public sealed class UsersController : ControllerBase
{
    private readonly AppDbContext _db;

    public UsersController(AppDbContext db) => _db = db;

    [HttpDelete]
    public async Task<IActionResult> Delete(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();

        _db.BudgetItems.RemoveRange(await _db.BudgetItems.Where(x => _db.Budgets.Any(b => b.Id == x.BudgetId && b.UserId == userId.Value)).ToListAsync(cancellationToken));
        _db.Budgets.RemoveRange(await _db.Budgets.Where(x => x.UserId == userId.Value).ToListAsync(cancellationToken));
        _db.CategoryRules.RemoveRange(await _db.CategoryRules.Where(x => x.UserId == userId.Value).ToListAsync(cancellationToken));
        _db.Transactions.RemoveRange(await _db.Transactions.Where(x => x.UserId == userId.Value).ToListAsync(cancellationToken));
        _db.Accounts.RemoveRange(await _db.Accounts.Where(x => x.UserId == userId.Value).ToListAsync(cancellationToken));
        _db.Categories.RemoveRange(await _db.Categories.Where(x => x.UserId == userId.Value).ToListAsync(cancellationToken));
        var user = await _db.Users.FirstOrDefaultAsync(x => x.Id == userId.Value, cancellationToken);
        if (user is not null) _db.Users.Remove(user);
        await _db.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
