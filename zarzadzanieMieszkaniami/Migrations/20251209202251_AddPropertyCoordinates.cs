using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace zarzadzanieMieszkaniami.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyCoordinates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "latitude",
                table: "properties",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "longitude",
                table: "properties",
                type: "double precision",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "latitude",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "longitude",
                table: "properties");
        }
    }
}
