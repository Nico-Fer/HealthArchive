using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class DBStructureDefined : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "password",
                table: "Doctors",
                newName: "Password");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "Doctors",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "email",
                table: "Doctors",
                newName: "Email");

            migrationBuilder.RenameColumn(
                name: "phoneNumber",
                table: "Doctors",
                newName: "PhoneNumber_PhoneNumber");

            migrationBuilder.RenameColumn(
                name: "userId",
                table: "Doctors",
                newName: "Id");

            migrationBuilder.AddColumn<DateTime>(
                name: "BirthDate",
                table: "Doctors",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Doctors",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LastName",
                table: "Doctors",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PhoneNumber_CountryCode",
                table: "Doctors",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Patients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DNI = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BirthDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Country = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhoneNumber_CountryCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PhoneNumber_PhoneNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HomeAddress = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Patients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HCEs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "MedicalCoverages",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Number = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Coverage = table.Column<string>(type: "nvarchar(max)", nullable: true)
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

            migrationBuilder.CreateTable(
                name: "Evolution",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HCEId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Evolution", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Evolution_HCEs_HCEId",
                        column: x => x.HCEId,
                        principalTable: "HCEs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Evolution_HCEId",
                table: "Evolution",
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
                name: "Evolution");

            migrationBuilder.DropTable(
                name: "MedicalCoverages");

            migrationBuilder.DropTable(
                name: "HCEs");

            migrationBuilder.DropTable(
                name: "Patients");

            migrationBuilder.DropColumn(
                name: "BirthDate",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "LastName",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "PhoneNumber_CountryCode",
                table: "Doctors");

            migrationBuilder.RenameColumn(
                name: "Password",
                table: "Doctors",
                newName: "password");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Doctors",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "Email",
                table: "Doctors",
                newName: "email");

            migrationBuilder.RenameColumn(
                name: "PhoneNumber_PhoneNumber",
                table: "Doctors",
                newName: "phoneNumber");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Doctors",
                newName: "userId");
        }
    }
}
