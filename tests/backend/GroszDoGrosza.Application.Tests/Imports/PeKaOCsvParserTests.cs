using System.Text;
using FluentAssertions;
using GroszDoGrosza.Application.Imports.PeKaO;

namespace GroszDoGrosza.Application.Tests.Imports;

public sealed class PeKaOCsvParserTests
{
    static PeKaOCsvParserTests()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    [Fact]
    public async Task ParseAsync_should_parse_real_sample_csv()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\..\Lista_operacji_20260712_205807.csv"));
        await using var stream = File.OpenRead(path);
        var parser = new PeKaOCsvParser();

        var result = await parser.ParseAsync(stream);

        result.TotalRows.Should().BeGreaterThan(0);
        result.ParsedRows.Should().BeGreaterThan(0);
        result.Items.Should().NotBeEmpty();
        result.Items.First().Currency.Should().Be("PLN");
        result.Items.First().TransactionType.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task ParseAsync_should_calculate_source_hash_for_each_row()
    {
        var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, @"..\..\..\..\..\..\Lista_operacji_20260712_205807.csv"));
        await using var stream = File.OpenRead(path);
        var parser = new PeKaOCsvParser();

        var result = await parser.ParseAsync(stream);

        result.Items.Select(x => x.SourceRowHash).Distinct(StringComparer.OrdinalIgnoreCase).Count()
            .Should().Be(result.Items.Count);
    }
}
