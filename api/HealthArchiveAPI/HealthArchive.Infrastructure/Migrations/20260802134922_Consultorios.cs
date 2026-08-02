using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Consultorios : Migration
    {
        // Consultorio que hereda todos los datos que ya existían. El Guid es fijo para
        // que la migración sea determinística y para que el seeder de Program.cs pueda
        // encontrarlo y completarle el CodeHash (que no se puede hashear desde SQL).
        private const string ConsultorioInicialId = "11111111-1111-1111-1111-111111111111";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ORDEN IMPORTANTE. La tabla y su fila inicial van PRIMERO: las columnas
            // ConsultorioId se agregan con esa fila como defaultValue, así los doctores
            // y pacientes que ya existían quedan backfilleados en el mismo paso y las
            // foreign keys se pueden crear sin violaciones.
            migrationBuilder.CreateTable(
                name: "Consultorios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CodeHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Consultorios", x => x.Id);
                });

            // CodeHash vacío a propósito: lo completa el seeder al arrancar, hasheando
            // Registration:ConsultoryCode.
            migrationBuilder.InsertData(
                table: "Consultorios",
                columns: new[] { "Id", "Name", "CodeHash", "CreatedAt" },
                values: new object[]
                {
                    new Guid(ConsultorioInicialId),
                    "Consultorio principal",
                    "",
                    new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Unspecified)
                });

            migrationBuilder.AddColumn<Guid>(
                name: "ConsultorioId",
                table: "Patients",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid(ConsultorioInicialId));

            migrationBuilder.AddColumn<Guid>(
                name: "ConsultorioId",
                table: "Doctors",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid(ConsultorioInicialId));

            // OJO: este índice es UNIQUE y todos los pacientes preexistentes caen en el
            // mismo consultorio. Si la base traía DNIs duplicados (la unicidad se validaba
            // solo en el controller, no había constraint), la migración va a fallar acá.
            // Detectarlos antes con:
            //   SELECT "DNI", count(*) FROM "Patients" GROUP BY "DNI" HAVING count(*) > 1;
            migrationBuilder.CreateIndex(
                name: "IX_Patients_ConsultorioId_DNI",
                table: "Patients",
                columns: new[] { "ConsultorioId", "DNI" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_ConsultorioId",
                table: "Doctors",
                column: "ConsultorioId");

            migrationBuilder.CreateIndex(
                name: "IX_Consultorios_Name",
                table: "Consultorios",
                column: "Name",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Doctors_Consultorios_ConsultorioId",
                table: "Doctors",
                column: "ConsultorioId",
                principalTable: "Consultorios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Patients_Consultorios_ConsultorioId",
                table: "Patients",
                column: "ConsultorioId",
                principalTable: "Consultorios",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Doctors_Consultorios_ConsultorioId",
                table: "Doctors");

            migrationBuilder.DropForeignKey(
                name: "FK_Patients_Consultorios_ConsultorioId",
                table: "Patients");

            migrationBuilder.DropTable(
                name: "Consultorios");

            migrationBuilder.DropIndex(
                name: "IX_Patients_ConsultorioId_DNI",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_ConsultorioId",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "ConsultorioId",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "ConsultorioId",
                table: "Doctors");
        }
    }
}
