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
                x.ExternalTransactionId,
                x.RefundTransactionId,
                x.IsSplit))
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
                x.ExternalTransactionId,
                x.RefundTransactionId,
                x.IsSplit))
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
            transaction.ExternalTransactionId,
            transaction.RefundTransactionId,
            transaction.IsSplit);

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

        if (request.RefundTransactionId.HasValue)
        {
            if (request.Direction != "Expense" || request.RefundTransactionId == id)
                return BadRequest("Zwrot można przypisać wyłącznie do wydatku.");
            var refund = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == request.RefundTransactionId && x.UserId == userId.Value, cancellationToken);
            if (refund is null || refund.Direction != "Income")
                return BadRequest("Wskazana transakcja nie jest przychodem użytkownika.");
            var alreadyLinked = await _dbContext.Transactions.AnyAsync(x => x.UserId == userId.Value && x.Id != id && x.RefundTransactionId == request.RefundTransactionId, cancellationToken);
            if (alreadyLinked)
                return BadRequest("Ten zwrot jest już połączony z inną transakcją.");
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
            request.ExternalTransactionId,
            RefundTransactionId = request.RefundTransactionId
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

    [HttpGet("{id:guid}/splits")]
    public async Task<ActionResult<IReadOnlyList<TransactionSplitItem>>> GetSplits(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId(); if (!userId.HasValue) return Unauthorized();
        var owns = await _dbContext.Transactions.AnyAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (!owns) return NotFound();
        return Ok(await _dbContext.TransactionSplits.AsNoTracking().Where(x => x.TransactionId == id)
            .Select(x => new TransactionSplitItem(x.Id, x.CategoryId, x.Amount, x.Memo)).ToListAsync(cancellationToken));
    }

    [HttpPut("{id:guid}/splits")]
    public async Task<IActionResult> SaveSplits(Guid id, [FromBody] TransactionSplitRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId(); if (!userId.HasValue) return Unauthorized();
        var transaction = await _dbContext.Transactions.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, cancellationToken);
        if (transaction is null) return NotFound();
        if (transaction.Direction != "Expense") return BadRequest("Podział jest dostępny wyłącznie dla wydatków.");
        if (request.Items.Count < 2 || request.Items.Any(x => x.Amount <= 0) || Math.Abs(request.Items.Sum(x => x.Amount) - Math.Abs(transaction.Amount)) > 0.01m)
            return BadRequest("Podział musi zawierać co najmniej dwie dodatnie kwoty, których suma równa się kwocie wydatku.");
        _dbContext.TransactionSplits.RemoveRange(_dbContext.TransactionSplits.Where(x => x.TransactionId == id));
        _dbContext.TransactionSplits.AddRange(request.Items.Select(x => new TransactionSplit(id, x.CategoryId, x.Amount, x.Memo ?? string.Empty)));
        _dbContext.Entry(transaction).Property(x => x.IsSplit).CurrentValue = true;
        await _dbContext.SaveChangesAsync(cancellationToken); return NoContent();
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
