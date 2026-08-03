using GroszDoGrosza.Application.Transactions.Models;
using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Domain.Transactions;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/transactions")]
public sealed class TransactionsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public TransactionsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionListItem>>> GetAll(
        [FromQuery] Guid? accountId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 5000);

        var query = _dbContext.Transactions.AsNoTracking();
        if (accountId.HasValue)
        {
            query = query.Where(x => x.AccountId == accountId.Value);
        }
        query = query.Where(x => x.UserId == userId.Value);

        var items = await query
            .OrderByDescending(x => x.OccurredAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new TransactionListItem(
                x.Id,
                x.UserId,
                x.AccountId,
                x.OccurredAt,
                x.Amount,
                x.Currency,
                x.Direction,
                x.Status,
                x.Description,
                x.CounterpartyName,
                x.CategoryId,
                x.TransactionType,
                x.ExternalTransactionId))
            .ToListAsync(cancellationToken);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionListItem>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var item = await _dbContext.Transactions.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new TransactionListItem(
                x.Id,
                x.UserId,
                x.AccountId,
                x.OccurredAt,
                x.Amount,
                x.Currency,
                x.Direction,
                x.Status,
                x.Description,
                x.CounterpartyName,
                x.CategoryId,
                x.TransactionType,
                x.ExternalTransactionId))
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<TransactionListItem>> Create([FromBody] TransactionUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var transaction = new Transaction(
            userId.Value,
            request.AccountId,
            request.OccurredAt.ToUniversalTime(),
            request.BookedAt?.ToUniversalTime(),
            request.Amount,
            request.Currency,
            request.Direction,
            request.Status,
            request.Description,
            request.CounterpartyName,
            request.CounterpartyAccount,
            request.Iban,
            request.Merchant,
            request.CategoryId,
            request.TransactionType,
            request.ReferenceNumber,
            request.ExternalTransactionId);

        _dbContext.Transactions.Add(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var result = new TransactionListItem(
            transaction.Id,
            transaction.UserId,
            transaction.AccountId,
            transaction.OccurredAt,
            transaction.Amount,
            transaction.Currency,
            transaction.Direction,
            transaction.Status,
            transaction.Description,
            transaction.CounterpartyName,
            transaction.CategoryId,
            transaction.TransactionType,
            transaction.ExternalTransactionId);

        return CreatedAtAction(nameof(GetById), new { id = transaction.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] TransactionUpsertRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (transaction is null || transaction.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Entry(transaction).CurrentValues.SetValues(new
        {
            transaction.Id,
            transaction.UserId,
            request.AccountId,
            OccurredAt = request.OccurredAt.ToUniversalTime(),
            BookedAt = request.BookedAt?.ToUniversalTime(),
            request.Amount,
            request.Currency,
            request.Direction,
            request.Status,
            request.Description,
            request.CounterpartyName,
            request.CounterpartyAccount,
            request.Iban,
            request.Merchant,
            request.CategoryId,
            request.TransactionType,
            transaction.IsSplit,
            transaction.IsReconciled,
            request.ReferenceNumber,
            request.ExternalTransactionId
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("all")]
    public async Task<IActionResult> DeleteAll(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();

        var transactions = await _dbContext.Transactions
            .Where(x => x.UserId == userId.Value)
            .ToListAsync(cancellationToken);
        _dbContext.Transactions.RemoveRange(transactions);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized();
        }

        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (transaction is null || transaction.UserId != userId.Value)
        {
            return NotFound();
        }

        _dbContext.Transactions.Remove(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/irrelevant")]
    public async Task<IActionResult> MarkIrrelevant(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (transaction is null) return NotFound();
        _dbContext.Entry(transaction).Property(x => x.Status).CurrentValue = "Ignored";
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:guid}/relevant")]
    public async Task<IActionResult> MarkRelevant(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (transaction is null) return NotFound();
        _dbContext.Entry(transaction).Property(x => x.Status).CurrentValue = "Imported";
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpPatch("{id:guid}/category")]
    public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] Guid? categoryId, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (transaction is null) return NotFound();
        _dbContext.Entry(transaction).Property(x => x.CategoryId).CurrentValue = categoryId;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
