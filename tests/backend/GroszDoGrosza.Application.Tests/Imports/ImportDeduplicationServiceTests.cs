using FluentAssertions;
using GroszDoGrosza.Application.Imports.Models;
using GroszDoGrosza.Infrastructure.Imports;

namespace GroszDoGrosza.Application.Tests.Imports;

public sealed class ImportDeduplicationServiceTests
{
    [Fact]
    public async Task FilterDuplicatesAsync_should_remove_duplicates_within_batch()
    {
        var service = new ImportDeduplicationService();
        var drafts = new[]
        {
            new ImportedTransactionDraft(DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow), "A", null, null, null, "T1", 10m, "PLN", null, "TYPE", "CAT", "HASH1"),
            new ImportedTransactionDraft(DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow), "A", null, null, null, "T1", 10m, "PLN", null, "TYPE", "CAT", "HASH1"),
            new ImportedTransactionDraft(DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow), "B", null, null, null, "T2", 20m, "PLN", null, "TYPE", "CAT", "HASH2")
        };

        var result = await service.FilterDuplicatesAsync(Guid.NewGuid(), drafts);

        result.Should().HaveCount(2);
        result.Select(x => x.SourceRowHash).Should().BeEquivalentTo(["HASH1", "HASH2"]);
    }
}
