namespace GroszDoGrosza.Application.Categories.Models;

public sealed record CategoryUpsertRequest(
    Guid UserId,
    Guid? ParentId,
    string Name,
    string? Color = null,
    string? Icon = null,
    int SortOrder = 0,
    bool IsSystem = false);
