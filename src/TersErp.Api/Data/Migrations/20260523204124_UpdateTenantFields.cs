using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TersErp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTenantFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "name",
                table: "tenant",
                newName: "tenant_code");

            migrationBuilder.RenameColumn(
                name: "domain",
                table: "tenant",
                newName: "name_en");

            migrationBuilder.AddColumn<string>(
                name: "name_ar",
                table: "tenant",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_tenant_tenant_code",
                table: "tenant",
                column: "tenant_code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_tenant_tenant_code",
                table: "tenant");

            migrationBuilder.DropColumn(
                name: "name_ar",
                table: "tenant");

            migrationBuilder.RenameColumn(
                name: "tenant_code",
                table: "tenant",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "name_en",
                table: "tenant",
                newName: "domain");
        }
    }
}
