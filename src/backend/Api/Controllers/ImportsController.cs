using GroszDoGrosza.Application.Imports.Abstractions;
using GroszDoGrosza.Api.Security;
using GroszDoGrosza.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace GroszDoGrosza.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/imports")]
public sealed class ImportsController : ControllerBase
{
    private readonly ITransactionImportService _importService;
    private readonly AppDbContext _dbContext;

    public ImportsController(ITransactionImportService importService, AppDbContext dbContext)
    {
        _importService = importService;
        _dbContext = dbContext;
    }

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Import(IFormFile file, [FromForm] Guid accountId, [FromForm] string? categoryMapping, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue) return Unauthorized();
        if (!await _dbContext.Accounts.AnyAsync(x => x.Id == accountId && x.UserId == userId.Value && !x.IsArchived, cancellationToken))
            return NotFound("Konto nie istnieje lub nie należy do użytkownika.");
        if (file.Length == 0)
        {
            return BadRequest("Empty file.");
        }

        await using var stream = file.OpenReadStream();
        var mapping = string.IsNullOrWhiteSpace(categoryMapping) ? null : JsonSerializer.Deserialize<Dictionary<string, string>>(categoryMapping);
        var result = await _importService.ImportAsync(userId.Value, accountId, file.FileName, stream, mapping, cancellationToken);
        return Ok(result);
    }
}
