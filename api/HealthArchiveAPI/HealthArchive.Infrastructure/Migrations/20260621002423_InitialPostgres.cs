using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialPostgres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Doctors",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    Password = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber_CountryCode = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber_PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    Tuition = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Doctors", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    LastName = table.Column<string>(type: "text", nullable: false),
                    DNI = table.Column<string>(type: "text", nullable: false),
                    BirthDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber_CountryCode = table.Column<string>(type: "text", nullable: false),
                    PhoneNumber_PhoneNumber = table.Column<string>(type: "text", nullable: false),
                    Ocupation = table.Column<string>(type: "text", nullable: false),
                    HomeAddress = table.Column<string>(type: "text", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: false),
                    MedicalCoverage_Number = table.Column<string>(type: "text", nullable: true),
                    MedicalCoverage_Coverage = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HCEs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HCEs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HCEs_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Evolutions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HCEId = table.Column<Guid>(type: "uuid", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    EvolutionInfo_ModifiedBy = table.Column<string>(type: "text", nullable: false),
                    EvolutionInfo_Tuition = table.Column<string>(type: "text", nullable: false),
                    ModifiedDate = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evolutions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evolutions_HCEs_HCEId",
                        column: x => x.HCEId,
                        principalTable: "HCEs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HCEFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<byte[]>(type: "bytea", nullable: false),
                    HCEId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HCEFiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HCEFiles_HCEs_HCEId",
                        column: x => x.HCEId,
                        principalTable: "HCEs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Evolutions_HCEId",
                table: "Evolutions",
                column: "HCEId");

            migrationBuilder.CreateIndex(
                name: "IX_HCEFiles_HCEId",
                table: "HCEFiles",
                column: "HCEId");

            migrationBuilder.CreateIndex(
                name: "IX_HCEs_PatientId",
                table: "HCEs",
                column: "PatientId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Doctors");

            migrationBuilder.DropTable(
                name: "Evolutions");

            migrationBuilder.DropTable(
                name: "HCEFiles");

            migrationBuilder.DropTable(
                name: "HCEs");

            migrationBuilder.DropTable(
                name: "Patients");
        }
    }
}
