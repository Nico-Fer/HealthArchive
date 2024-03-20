using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class TuitionAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Doctors");

            migrationBuilder.AddColumn<string>(
                name: "Tuition",
                table: "Doctors",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Tuition",
                table: "Doctors");

            migrationBuilder.AddColumn<DateTime>(
                name: "BirthDate",
                table: "Doctors",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));
        }
    }
}
