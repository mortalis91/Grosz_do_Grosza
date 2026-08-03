using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GroszDoGrosza.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundTransaction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RefundTransactionId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_RefundTransactionId",
                table: "Transactions",
                column: "RefundTransactionId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Transactions_RefundTransactionId",
                table: "Transactions",
                column: "RefundTransactionId",
                principalTable: "Transactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Transactions_RefundTransactionId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_RefundTransactionId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "RefundTransactionId",
                table: "Transactions");
        }
    }
}
