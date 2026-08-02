using GroszDoGrosza.Application.Common.Abstractions;
using GroszDoGrosza.Application.Categories.Abstractions;
using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Application.Imports.Models;
using GroszDoGrosza.Domain.Categories;
using GroszDoGrosza.Domain.Imports;
using GroszDoGrosza.Domain.Transactions;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace GroszDoGrosza.Infrastructure.Imports;

public sealed class TransactionImportService : ITransactionImportService
{
    private readonly AppDbContext _dbContext;
    private readonly ITransactionImportParser _parser;
    private readonly IImportDeduplicationService _deduplicationService;
    private readonly ICategoryRuleMatcher _categoryRuleMatcher;
    private readonly IClock _clock;

    public TransactionImportService(
        AppDbContext dbContext,
        ITransactionImportParser parser,
        IImportDeduplicationService deduplicationService,
        ICategoryRuleMatcher categoryRuleMatcher,
        IClock clock)
    {
        _dbContext = dbContext;
        _parser = parser;
        _deduplicationService = deduplicationService;
        _categoryRuleMatcher = categoryRuleMatcher;
        _clock = clock;
    }

    public async Task<ImportCommandResult> ImportAsync(Guid userId, Guid accountId, string fileName, Stream stream, IReadOnlyDictionary<string, string>? categoryMapping = null, CancellationToken cancellationToken = default)
    {
        if (!_parser.CanParse(fileName, stream))
        {
            throw new InvalidOperationException("Unsupported file format.");
        }

        stream.Position = 0;
        var parseResult = await _parser.ParseAsync(stream, cancellationToken);
        var uniqueDrafts = await _deduplicationService.FilterDuplicatesAsync(accountId, parseResult.Items, cancellationToken);

        var sourceHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(
            string.Join('|', parseResult.Items.Select(x => x.SourceRowHash)))));
        var batch = await _dbContext.ImportBatches
            .FirstOrDefaultAsync(x => x.UserId == userId && x.AccountId == accountId && x.SourceHash == sourceHash, cancellationToken);
        if (batch is null)
        {
            batch = new ImportBatch(userId, accountId, "PeKaO CSV", fileName, sourceHash);
            _dbContext.ImportBatches.Add(batch);
        }

        // Keep the values as a List so EF Core translates Contains to SQL IN reliably.
        var draftHashes = uniqueDrafts.Select(x => x.SourceRowHash).ToList();
        var existingHashes = await _dbContext.Transactions
            .Where(x => x.AccountId == accountId && x.ExternalTransactionId != null && draftHashes.Contains(x.ExternalTransactionId))
            .Select(x => x.ExternalTransactionId!)
            .ToListAsync(cancellationToken);

        var duplicateSet = existingHashes.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var created = 0;
        var duplicateRows = 0;
        var rowNumber = 1;
        var rules = await _dbContext.CategoryRules
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.IsEnabled)
            .ToListAsync(cancellationToken);
        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(x => x.UserId == userId && !x.IsArchived)
            .Select(x => new { x.Id, x.Name })
            .ToListAsync(cancellationToken);

        foreach (var draft in uniqueDrafts)
        {
            if (duplicateSet.Contains(draft.SourceRowHash))
            {
                duplicateRows++;
                _dbContext.ImportLogs.Add(new ImportLog(batch.Id, rowNumber, "Info", "Duplicate transaction skipped.", draft.Title));
                rowNumber++;
                continue;
            }

            var mappedCategory = categoryMapping is not null && categoryMapping.TryGetValue(draft.Category.Trim(), out var mappedName) ? mappedName : draft.Category;
            var importedCategoryId = categories
                .FirstOrDefault(x => string.Equals(x.Name.Trim(), mappedCategory.Trim(), StringComparison.OrdinalIgnoreCase))?.Id;
            var description = Regex.IsMatch(draft.Title.Trim(), "^[0-9*]+$") && !string.IsNullOrWhiteSpace(draft.CounterpartyName)
                ? draft.CounterpartyName
                : draft.Title;
            var transaction = new Transaction(
                userId,
                accountId,
                draft.BookingDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                draft.ValueDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                draft.Amount,
                draft.Currency,
                draft.Amount < 0 ? "Expense" : "Income",
                "Imported",
                description,
                draft.CounterpartyName,
                draft.SourceAccount,
                draft.TargetAccount,
                draft.CounterpartyName,
                importedCategoryId,
                draft.TransactionType,
                draft.ReferenceNumber,
                draft.SourceRowHash);
            var matchedCategoryId = _categoryRuleMatcher.MatchCategoryId(transaction, rules) ?? importedCategoryId;
            if (matchedCategoryId.HasValue)
            {
                transaction = new Transaction(
                    userId,
                    accountId,
                    draft.BookingDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                    draft.ValueDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
                    draft.Amount,
                    draft.Currency,
                    draft.Amount < 0 ? "Expense" : "Income",
                    "Imported",
                    description,
                    draft.CounterpartyName,
                    draft.SourceAccount,
                    draft.TargetAccount,
                    draft.CounterpartyName,
                    matchedCategoryId,
                    draft.TransactionType,
                    draft.ReferenceNumber,
                    draft.SourceRowHash);
            }
            _dbContext.Transactions.Add(transaction);
            _dbContext.ImportLogs.Add(new ImportLog(batch.Id, rowNumber, "Info", "Transaction imported.", draft.Title));
            created++;
            rowNumber++;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        batch.MarkCompleted(parseResult.TotalRows, created, parseResult.SkippedRows, duplicateRows, 0);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ImportCommandResult(batch.Id, parseResult.TotalRows, created, duplicateRows, parseResult.SkippedRows);
    }
}
