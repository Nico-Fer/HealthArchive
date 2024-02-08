using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddingEvolution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Evolution_HCEs_HCEId",
                table: "Evolution");

            migrationBuilder.DropTable(
                name: "MedicalCoverages");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Evolution",
                table: "Evolution");

            migrationBuilder.RenameTable(
                name: "Evolution",
                newName: "Evolutions");

            migrationBuilder.RenameIndex(
                name: "IX_Evolution_HCEId",
                table: "Evolutions",
                newName: "IX_Evolutions_HCEId");

            migrationBuilder.AddColumn<string>(
                name: "MedicalCoverage_Coverage",
                table: "Patients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicalCoverage_Number",
                table: "Patients",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Evolutions",
                table: "Evolutions",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Evolutions_HCEs_HCEId",
                table: "Evolutions",
                column: "HCEId",
                principalTable: "HCEs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Evolutions_HCEs_HCEId",
                table: "Evolutions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Evolutions",
                table: "Evolutions");

            migrationBuilder.DropColumn(
                name: "MedicalCoverage_Coverage",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MedicalCoverage_Number",
                table: "Patients");

            migrationBuilder.RenameTable(
                name: "Evolutions",
                newName: "Evolution");

            migrationBuilder.RenameIndex(
                name: "IX_Evolutions_HCEId",
                table: "Evolution",
                newName: "IX_Evolution_HCEId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Evolution",
                table: "Evolution",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "MedicalCoverages",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Coverage = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Number = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicalCoverages", x => x.PatientId);
                    table.ForeignKey(
                        name: "FK_MedicalCoverages_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Evolution_HCEs_HCEId",
                table: "Evolution",
                column: "HCEId",
                principalTable: "HCEs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
