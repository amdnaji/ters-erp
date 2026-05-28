using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TersErp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBilingualRoleNameAndTenantRelation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clean up any legacy, invalid pre-migration roles to avoid FK constraint violations
            migrationBuilder.Sql("UPDATE users SET role_id = NULL;");
            migrationBuilder.Sql("DELETE FROM role_permission;");
            migrationBuilder.Sql("DELETE FROM role;");

            migrationBuilder.AddColumn<string>(
                name: "role_name",
                table: "role",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_role_tenant_id",
                table: "role",
                column: "tenant_id");

            migrationBuilder.AddForeignKey(
                name: "fk_role_tenant_tenant_id",
                table: "role",
                column: "tenant_id",
                principalTable: "tenant",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_role_tenant_tenant_id",
                table: "role");

            migrationBuilder.DropIndex(
                name: "ix_role_tenant_id",
                table: "role");

            migrationBuilder.DropColumn(
                name: "role_name",
                table: "role");
        }
    }
}
