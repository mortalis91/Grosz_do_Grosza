using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GroszDoGrosza.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetItemComment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comment",
                table: "BudgetItems",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Comment",
                table: "BudgetItems");
        }
    }
}
