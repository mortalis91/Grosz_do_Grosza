using GroszDoGrosza.Application.Accounts.Models;
using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Domain.Accounts;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/accounts")]
public sealed class AccountsController : ControllerBase
{
    private static readonly HashSet<string> AllowedAccountTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "Bank", "Giełda", "Lokata", "PPE/PPK"
    };

    private readonly AppDbContext _dbContext;

    public AccountsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AccountListItem>>> GetAll(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var query = _dbContext.Accounts.AsNoTracking();
        query = query.Where(x => x.UserId == userId.Value && !x.IsArchived);

        var items = await query
            .OrderBy(x => x.Name)
            .Select(x => new AccountListItem(x.Id, x.UserId, x.Name, x.AccountType, x.Currency, x.CurrentBalance, x.IsArchived, x.ExternalAccountId))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<AccountListItem>> Create([FromBody] AccountUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var validation = Validate(request);
        if (validation is not null) return BadRequest(validation);

        var account = new Account(userId.Value, request.Name, request.AccountType, request.Currency, request.CurrentBalance, request.ExternalAccountId);
        _dbContext.Accounts.Add(account);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = new AccountListItem(account.Id, account.UserId, account.Name, account.AccountType, account.Currency, account.CurrentBalance, account.IsArchived, account.ExternalAccountId);
        return CreatedAtAction(nameof(GetById), new { id = account.Id }, result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AccountListItem>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var item = await _dbContext.Accounts.AsNoTracking()
            .Where(x => x.Id == id && x.UserId == userId.Value)
            .Select(x => new AccountListItem(x.Id, x.UserId, x.Name, x.AccountType, x.Currency, x.CurrentBalance, x.IsArchived, x.ExternalAccountId))
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] AccountUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var validation = Validate(request);
        if (validation is not null) return BadRequest(validation);

        var account = await _dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (account is null || account.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Entry(account).CurrentValues.SetValues(new
        {
            account.Id,
            account.UserId,
            request.Name,
            request.AccountType,
            request.Currency,
            request.CurrentBalance,
            account.IsArchived,
            request.ExternalAccountId
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

        var account = await _dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (account is null || account.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Entry(account).Property(x => x.IsArchived).CurrentValue = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var account = await _dbContext.Accounts.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (account is null) return NotFound();
        _dbContext.Entry(account).Property(x => x.IsArchived).CurrentValue = true;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private static string? Validate(AccountUpsertRequest request)
    {
        if (request.AccountType is "Cash" or "Investment" or "Retirement" or "Crypto" or "PreciousMetals" or "RealEstate") return ValidateCommon(request);
        if (string.IsNullOrWhiteSpace(request.Name)) return "Nazwa konta jest wymagana.";
        if (request.Name.Length > 128) return "Nazwa konta może mieć maksymalnie 128 znaków.";
        if (!AllowedAccountTypes.Contains(request.AccountType)) return "Nieobsługiwany typ konta.";
        if (request.Currency is null || request.Currency.Length != 3 || request.Currency.Any(char.IsWhiteSpace)) return "Waluta musi być trzyznakowym kodem ISO.";
        if (request.CurrentBalance < -1000000000000m || request.CurrentBalance > 1000000000000m) return "Saldo ma nieprawidłową wartość.";
        return null;
    }

    private static string? ValidateCommon(AccountUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) return "Nazwa konta jest wymagana.";
        if (request.Currency is null || request.Currency.Length != 3 || request.Currency.Any(char.IsWhiteSpace)) return "Waluta musi być trzyznakowym kodem ISO.";
        if (request.CurrentBalance < -1000000000000m || request.CurrentBalance > 1000000000000m) return "Saldo ma nieprawidłową wartość.";
        return null;
    }
}
