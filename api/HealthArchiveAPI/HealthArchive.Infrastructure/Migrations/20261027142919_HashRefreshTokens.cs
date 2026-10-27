using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchive.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class HashRefreshTokens : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Token",
                table: "RefreshTokens",
                newName: "TokenHash");

            migrationBuilder.RenameColumn(
                name: "ReplacedByToken",
                table: "RefreshTokens",
                newName: "ReplacedByTokenHash");

            migrationBuilder.RenameIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                newName: "IX_RefreshTokens_TokenHash");

            // Hasta acá los refresh tokens se guardaban en claro, así que quien leyera la
            // tabla podía usarlos. Dos cosas a la vez:
            //  - reemplaza el valor por su hash, en el mismo formato que
            //    TokenService.HashRefreshToken (SHA-256 del UTF-8, en base64), para que no
            //    quede ningún token usable en la base;
            //  - revoca todos los que seguían activos: no hay forma de saber si alguno se
            //    filtró, así que todos los doctores tienen que volver a loguearse.
            // Las filas se conservan (DoctorId, CreatedAt) porque sirven para auditar.
            migrationBuilder.Sql("""
                UPDATE "RefreshTokens" SET
                    "TokenHash" = encode(sha256(convert_to("TokenHash", 'UTF8')), 'base64'),
                    "ReplacedByTokenHash" = CASE
                        WHEN "ReplacedByTokenHash" IS NULL THEN NULL
                        ELSE encode(sha256(convert_to("ReplacedByTokenHash", 'UTF8')), 'base64')
                    END,
                    "RevokedAt" = COALESCE("RevokedAt", now() AT TIME ZONE 'utc');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Solo deshace los nombres: un hash no se puede revertir. Los tokens quedan
            // hasheados y revocados, así que bajar esta migración también cierra todas
            // las sesiones (que es lo correcto: el código anterior buscaría en claro).
            migrationBuilder.RenameColumn(
                name: "TokenHash",
                table: "RefreshTokens",
                newName: "Token");

            migrationBuilder.RenameColumn(
                name: "ReplacedByTokenHash",
                table: "RefreshTokens",
                newName: "ReplacedByToken");

            migrationBuilder.RenameIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                newName: "IX_RefreshTokens_Token");
        }
    }
}
