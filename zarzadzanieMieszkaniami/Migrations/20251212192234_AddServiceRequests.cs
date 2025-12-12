using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace zarzadzanieMieszkaniami.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "service_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    issue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    serviceman_id = table.Column<Guid>(type: "uuid", nullable: false),
                    landlord_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    responded_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    response_message = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_service_requests", x => x.id);
                    table.ForeignKey(
                        name: "FK_service_requests_asp_net_users_landlord_id",
                        column: x => x.landlord_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_service_requests_asp_net_users_serviceman_id",
                        column: x => x.serviceman_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "f_k_service_requests_issues_issue_id",
                        column: x => x.issue_id,
                        principalTable: "issues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_issue_id_serviceman_id",
                table: "service_requests",
                columns: new[] { "issue_id", "serviceman_id" },
                unique: true,
                filter: "status = 'Oczekujące'");

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_landlord_id",
                table: "service_requests",
                column: "landlord_id");

            migrationBuilder.CreateIndex(
                name: "IX_service_requests_serviceman_id",
                table: "service_requests",
                column: "serviceman_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "service_requests");
        }
    }
}
