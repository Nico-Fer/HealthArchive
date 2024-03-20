using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HealthArchiveAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddHCEFileentity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "HCEFiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Content = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    HCEId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
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
                name: "IX_HCEFiles_HCEId",
                table: "HCEFiles",
                column: "HCEId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HCEFiles");
        }
    }
}
