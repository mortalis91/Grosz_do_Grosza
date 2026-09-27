using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GroszDoGrosza.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCurrentBalance : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CurrentBalance",
                table: "Accounts",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentBalance",
                table: "Accounts");
        }
    }
}
