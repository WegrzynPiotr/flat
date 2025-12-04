using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace zarzadzanieMieszkaniami.Migrations
{
    /// <inheritdoc />
    public partial class NewRoleSystemWithCommentsMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_properties_asp_net_users_current_tenant_id",
                table: "properties");

            migrationBuilder.DropForeignKey(
                name: "FK_properties_asp_net_users_owner_id",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "IX_properties_current_tenant_id",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "current_tenant_id",
                table: "properties");

            migrationBuilder.RenameIndex(
                name: "IX_properties_owner_id",
                table: "properties",
                newName: "i_x_properties_owner_id");

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_landlord_id",
                table: "asp_net_users",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "issue_comments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    issue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_issue_comments", x => x.id);
                    table.ForeignKey(
                        name: "f_k_issue_comments__asp_net_users_author_id",
                        column: x => x.author_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "f_k_issue_comments_issues_issue_id",
                        column: x => x.issue_id,
                        principalTable: "issues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "issue_servicemen",
                columns: table => new
                {
                    issue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    serviceman_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_issue_servicemen", x => new { x.issue_id, x.serviceman_id });
                    table.ForeignKey(
                        name: "f_k_issue_servicemen__asp_net_users_serviceman_id",
                        column: x => x.serviceman_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "f_k_issue_servicemen_issues_issue_id",
                        column: x => x.issue_id,
                        principalTable: "issues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "landlord_servicemen",
                columns: table => new
                {
                    landlord_id = table.Column<Guid>(type: "uuid", nullable: false),
                    serviceman_id = table.Column<Guid>(type: "uuid", nullable: false),
                    assigned_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_landlord_servicemen", x => new { x.landlord_id, x.serviceman_id });
                    table.ForeignKey(
                        name: "FK_landlord_servicemen_asp_net_users_landlord_id",
                        column: x => x.landlord_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_landlord_servicemen_asp_net_users_serviceman_id",
                        column: x => x.serviceman_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sender_id = table.Column<Guid>(type: "uuid", nullable: false),
                    receiver_id = table.Column<Guid>(type: "uuid", nullable: false),
                    content = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    is_read = table.Column<bool>(type: "boolean", nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("p_k_messages", x => x.id);
                    table.ForeignKey(
                        name: "FK_messages_asp_net_users_receiver_id",
                        column: x => x.receiver_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_messages_asp_net_users_sender_id",
                        column: x => x.sender_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "property_tenants",
                columns: table => new
                {
                    property_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tenant_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_tenants", x => new { x.property_id, x.tenant_id });
                    table.ForeignKey(
                        name: "f_k_property_tenants__asp_net_users_tenant_id",
                        column: x => x.tenant_id,
                        principalTable: "asp_net_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "f_k_property_tenants_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "i_x_issue_comments_author_id",
                table: "issue_comments",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "i_x_issue_comments_issue_id",
                table: "issue_comments",
                column: "issue_id");

            migrationBuilder.CreateIndex(
                name: "i_x_issue_servicemen_serviceman_id",
                table: "issue_servicemen",
                column: "serviceman_id");

            migrationBuilder.CreateIndex(
                name: "IX_landlord_servicemen_serviceman_id",
                table: "landlord_servicemen",
                column: "serviceman_id");

            migrationBuilder.CreateIndex(
                name: "IX_messages_receiver_id",
                table: "messages",
                column: "receiver_id");

            migrationBuilder.CreateIndex(
                name: "IX_messages_sender_id",
                table: "messages",
                column: "sender_id");

            migrationBuilder.CreateIndex(
                name: "i_x_property_tenants_tenant_id",
                table: "property_tenants",
                column: "tenant_id");

            migrationBuilder.AddForeignKey(
                name: "f_k_properties__asp_net_users_owner_id",
                table: "properties",
                column: "owner_id",
                principalTable: "asp_net_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "f_k_properties__asp_net_users_owner_id",
                table: "properties");

            migrationBuilder.DropTable(
                name: "issue_comments");

            migrationBuilder.DropTable(
                name: "issue_servicemen");

            migrationBuilder.DropTable(
                name: "landlord_servicemen");

            migrationBuilder.DropTable(
                name: "messages");

            migrationBuilder.DropTable(
                name: "property_tenants");

            migrationBuilder.DropColumn(
                name: "created_by_landlord_id",
                table: "asp_net_users");

            migrationBuilder.RenameIndex(
                name: "i_x_properties_owner_id",
                table: "properties",
                newName: "IX_properties_owner_id");

            migrationBuilder.AddColumn<Guid>(
                name: "current_tenant_id",
                table: "properties",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_properties_current_tenant_id",
                table: "properties",
                column: "current_tenant_id");

            migrationBuilder.AddForeignKey(
                name: "FK_properties_asp_net_users_current_tenant_id",
                table: "properties",
                column: "current_tenant_id",
                principalTable: "asp_net_users",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_properties_asp_net_users_owner_id",
                table: "properties",
                column: "owner_id",
                principalTable: "asp_net_users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
