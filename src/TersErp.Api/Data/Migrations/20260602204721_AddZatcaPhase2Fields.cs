using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TersErp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddZatcaPhase2Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "zatca_certificate",
                table: "tenant",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "zatca_environment",
                table: "tenant",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "zatca_invoice_counter",
                table: "tenant",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "zatca_private_key",
                table: "tenant",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "zatca_secret",
                table: "tenant",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "zatca_certificate",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "zatca_environment",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "zatca_invoice_counter",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "zatca_private_key",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "zatca_secret",
                table: "tenant");
        }
    }
}
