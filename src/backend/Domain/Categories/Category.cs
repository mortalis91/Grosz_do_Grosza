using GroszDoGrosza.Domain.Common;

namespace GroszDoGrosza.Domain.Categories;

public sealed class Category : AggregateRoot
{
    public Guid UserId { get; private set; }
    public Guid? ParentId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Color { get; private set; }
    public string? Icon { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsSystem { get; private set; }
    public bool IsArchived { get; private set; }

    private Category()
    {
    }

    public Category(Guid userId, Guid? parentId, string name, string? color, string? icon, int sortOrder, bool isSystem)
    {
        UserId = userId;
        ParentId = parentId;
        Name = name;
        Color = color;
        Icon = icon;
        SortOrder = sortOrder;
        IsSystem = isSystem;
    }
}
