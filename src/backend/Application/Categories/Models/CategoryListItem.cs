namespace GroszDoGrosza.Application.Categories.Models;

public sealed record CategoryListItem(
    Guid Id,
    Guid UserId,
    Guid? ParentId,
    string Name,
    string? Color,
    string? Icon,
    int SortOrder,
    bool IsSystem,
    bool IsArchived);
