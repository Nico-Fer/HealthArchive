using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class dha : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ModifiedBy",
                table: "Evolutions",
                newName: "EvolutionInfo_ModifiedBy");

            migrationBuilder.AddColumn<string>(
                name: "EvolutionInfo_Tuition",
                table: "Evolutions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EvolutionInfo_Tuition",
                table: "Evolutions");

            migrationBuilder.RenameColumn(
                name: "EvolutionInfo_ModifiedBy",
                table: "Evolutions",
                newName: "ModifiedBy");
        }
    }
}
