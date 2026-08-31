using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MultipleMedicalCoverages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PatientMedicalCoverages",
                columns: table => new
                {
                    PatientId = table.Column<Guid>(type: "uuid", nullable: false),
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Number = table.Column<string>(type: "text", nullable: true),
                    Coverage = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PatientMedicalCoverages", x => new { x.PatientId, x.Id });
                    table.ForeignKey(
                        name: "FK_PatientMedicalCoverages_Patients_PatientId",
                        column: x => x.PatientId,
                        principalTable: "Patients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Backfill ANTES de tirar las columnas viejas: cada paciente que tenía cargada
            // una cobertura pasa a tener exactamente una fila, y queda como principal
            // ("Order" = 0). Los que la tenían vacía no generan fila.
            //
            // El "Id" no se especifica a propósito: es identity, así que lo genera Postgres
            // y de paso avanza la secuencia. Si lo insertáramos a mano (Id = 1) la secuencia
            // quedaría en 1 y la próxima cobertura que agregue la app chocaría con la clave.
            migrationBuilder.Sql(@"
                INSERT INTO ""PatientMedicalCoverages"" (""PatientId"", ""Coverage"", ""Number"", ""Order"")
                SELECT ""Id"", ""MedicalCoverage_Coverage"", ""MedicalCoverage_Number"", 0
                FROM ""Patients""
                WHERE COALESCE(""MedicalCoverage_Coverage"", '') <> ''
                   OR COALESCE(""MedicalCoverage_Number"", '') <> '';");

            migrationBuilder.DropColumn(
                name: "MedicalCoverage_Coverage",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MedicalCoverage_Number",
                table: "Patients");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Es una migración destructiva sobre datos clínicos, así que el Down recupera
            // lo que se pueda: la cobertura principal vuelve a las columnas del paciente.
            // Las secundarias se pierden — el modelo viejo no tiene dónde ponerlas.
            migrationBuilder.AddColumn<string>(
                name: "MedicalCoverage_Coverage",
                table: "Patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicalCoverage_Number",
                table: "Patients",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""Patients"" p
                SET ""MedicalCoverage_Coverage"" = c.""Coverage"",
                    ""MedicalCoverage_Number""   = c.""Number""
                FROM ""PatientMedicalCoverages"" c
                WHERE c.""PatientId"" = p.""Id"" AND c.""Order"" = 0;");

            migrationBuilder.DropTable(
                name: "PatientMedicalCoverages");
        }
    }
}
