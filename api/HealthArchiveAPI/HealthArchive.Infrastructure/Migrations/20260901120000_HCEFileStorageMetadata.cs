using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Migración A del plan de docs/adjuntos-object-storage.md: agrega la metadata del
    /// bucket y vuelve Content nullable. No toca datos — el backfill que puebla
    /// StorageKey y vacía Content corre aparte (tools/adjuntos-bucket/), y la columna
    /// recién se dropea en la migración B, semanas después.
    ///
    /// Escrita a mano porque `dotnet ef` no corre en esta máquina (global.json pide el
    /// SDK 10.0.301). El Designer y el snapshot se actualizaron a la par; si en algún
    /// momento hay SDK, `dotnet ef migrations has-pending-model-changes` debería dar limpio.
    /// </remarks>
    public partial class HCEFileStorageMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<byte[]>(
                name: "Content",
                table: "HCEFiles",
                type: "bytea",
                nullable: true,
                oldClrType: typeof(byte[]),
                oldType: "bytea");

            migrationBuilder.AddColumn<string>(
                name: "ContentType",
                table: "HCEFiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sha256",
                table: "HCEFiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SizeBytes",
                table: "HCEFiles",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "HCEFiles",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "HCEFiles");

            migrationBuilder.DropColumn(
                name: "Sha256",
                table: "HCEFiles");

            migrationBuilder.DropColumn(
                name: "SizeBytes",
                table: "HCEFiles");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "HCEFiles");

            // Ojo: si el backfill ya vació Content, este default deja los adjuntos con 0
            // bytes — el contenido real hay que restaurarlo del bucket o del pg_dump
            // (ver el rollback por fase del plan). El esquema vuelve; los datos no solos.
            migrationBuilder.AlterColumn<byte[]>(
                name: "Content",
                table: "HCEFiles",
                type: "bytea",
                nullable: false,
                defaultValue: new byte[0],
                oldClrType: typeof(byte[]),
                oldType: "bytea",
                oldNullable: true);
        }
    }
}
