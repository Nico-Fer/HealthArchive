using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EvolutionAuthorAndDates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedByDoctorId",
                table: "Evolutions",
                type: "uuid",
                nullable: true);

            // defaultValueSql y no el DateTime.MinValue que genera EF: sin esto, cualquier
            // INSERT que no traiga la columna (por ejemplo el de tools/migracion-postgres)
            // guardaría el año 1. La app siempre la setea explícitamente en el create.
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedDate",
                table: "Evolutions",
                type: "timestamp without time zone",
                nullable: false,
                defaultValueSql: "(NOW() AT TIME ZONE 'utc')");

            // Las evoluciones que ya existían conservan su fecha real: hasta ahora
            // ModifiedDate era la única que había, y para una evolución nunca editada es
            // justamente la de creación. Que queden iguales es además lo que hace que la UI
            // las muestre como "nunca editada".
            migrationBuilder.Sql(@"UPDATE ""Evolutions"" SET ""CreatedDate"" = ""ModifiedDate"";");

            // CreatedByDoctorId queda NULL en todas las filas viejas a propósito: no se
            // backfillea por matrícula. Sin autor identificable, nadie las puede editar.

            migrationBuilder.CreateIndex(
                name: "IX_Evolutions_CreatedByDoctorId",
                table: "Evolutions",
                column: "CreatedByDoctorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Evolutions_Doctors_CreatedByDoctorId",
                table: "Evolutions",
                column: "CreatedByDoctorId",
                principalTable: "Doctors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Evolutions_Doctors_CreatedByDoctorId",
                table: "Evolutions");

            migrationBuilder.DropIndex(
                name: "IX_Evolutions_CreatedByDoctorId",
                table: "Evolutions");

            migrationBuilder.DropColumn(
                name: "CreatedByDoctorId",
                table: "Evolutions");

            migrationBuilder.DropColumn(
                name: "CreatedDate",
                table: "Evolutions");
        }
    }
}
