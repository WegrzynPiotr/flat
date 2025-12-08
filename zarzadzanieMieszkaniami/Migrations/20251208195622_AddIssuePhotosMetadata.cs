using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace zarzadzanieMieszkaniami.Migrations
{
    /// <inheritdoc />
    public partial class AddIssuePhotosMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "issue_photos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    issue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    uploaded_by_id = table.Column<Guid>(type: "uuid", nullable: false),
                    uploaded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_issue_photos", x => x.id);
                    table.ForeignKey(
                        name: "f_k_issue_photos__asp_net_users_uploaded_by_id",
                        column: x => x.uploaded_by_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "f_k_issue_photos_issues_issue_id",
                        column: x => x.issue_id,
                        principalTable: "issues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "i_x_issue_photos_issue_id",
                table: "issue_photos",
                column: "issue_id");

            migrationBuilder.CreateIndex(
                name: "i_x_issue_photos_uploaded_by_id",
                table: "issue_photos",
                column: "uploaded_by_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "issue_photos");
        }
    }
}
