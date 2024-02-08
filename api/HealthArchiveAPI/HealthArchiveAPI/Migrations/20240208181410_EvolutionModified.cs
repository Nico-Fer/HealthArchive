using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class EvolutionModified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModifiedBy",
                table: "Evolutions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ModifiedDate",
                table: "Evolutions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Evolutions",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModifiedBy",
                table: "Evolutions");

            migrationBuilder.DropColumn(
                name: "ModifiedDate",
                table: "Evolutions");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Evolutions");
        }
    }
}
