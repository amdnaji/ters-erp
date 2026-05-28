using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TersErp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UnifyBilingualSuffixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "name_ar",
                table: "tenant",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "description_ar",
                table: "role",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "name_ar",
                table: "account",
                newName: "name");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "description_en",
                table: "role");

            migrationBuilder.DropColumn(
                name: "name_en",
                table: "account");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "name",
                table: "tenant",
                newName: "name_ar");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "role",
                newName: "description_ar");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "account",
                newName: "name_ar");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "tenant",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "description_en",
                table: "role",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "name_en",
                table: "account",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
