using System;
using Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "7.0.10")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("Core.Models.Issue", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid")
                        .HasColumnName("id");

                    b.Property<string>("Category")
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)")
                        .HasColumnName("category");

                    b.Property<string>("Description")
                        .HasMaxLength(2000)
                        .HasColumnType("character varying(2000)")
                        .HasColumnName("description");

                    b.Property<string>("Photos")
                        .HasColumnType("text")
                        .HasColumnName("photos");

                    b.Property<string>("Priority")
                        .HasMaxLength(30)
                        .HasColumnType("character varying(30)")
                        .HasColumnName("priority");

                    b.Property<Guid>("PropertyId")
                        .HasColumnType("uuid")
                        .HasColumnName("property_id");

                    b.Property<Guid>("ReportedById")
                        .HasColumnType("uuid")
                        .HasColumnName("reported_by_id");

                    b.Property<DateTime>("ReportedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("reported_at");

                    b.Property<DateTime?>("ResolvedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("resolved_at");

                    b.Property<string>("Status")
                        .HasMaxLength(30)
                        .HasColumnType("character varying(30)")
                        .HasColumnName("status");

                    b.Property<string>("Title")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)")
                        .HasColumnName("title");

                    b.HasKey("Id")
                        .HasName("pk_issues");

                    b.HasIndex("PropertyId")
                        .HasName("ix_issues_property_id");

                    b.HasIndex("ReportedById")
                        .HasName("ix_issues_reported_by_id");

                    b.ToTable("issues", (string)null);
                });

            modelBuilder.Entity("Core.Models.Property", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid")
                        .HasColumnName("id");

                    b.Property<string>("Address")
                        .IsRequired()
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)")
                        .HasColumnName("address");

                    b.Property<decimal>("Area")
                        .HasColumnType("numeric(10,2)")
                        .HasColumnName("area");

                    b.Property<string>("City")
                        .IsRequired()
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)")
                        .HasColumnName("city");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("created_at");

                    b.Property<Guid?>("CurrentTenantId")
                        .HasColumnType("uuid")
                        .HasColumnName("current_tenant_id");

                    b.Property<Guid>("OwnerId")
                        .HasColumnType("uuid")
                        .HasColumnName("owner_id");

                    b.Property<string>("PostalCode")
                        .HasMaxLength(10)
                        .HasColumnType("character varying(10)")
                        .HasColumnName("postal_code");

                    b.Property<int>("RoomsCount")
                        .HasColumnType("integer")
                        .HasColumnName("rooms_count");

                    b.HasKey("Id")
                        .HasName("pk_properties");

                    b.HasIndex("CurrentTenantId")
                        .HasName("ix_properties_current_tenant_id");

                    b.HasIndex("OwnerId")
                        .HasName("ix_properties_owner_id");

                    b.ToTable("properties", (string)null);
                });

            modelBuilder.Entity("Core.Models.RefreshToken", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("created_at");

                    b.Property<DateTime>("ExpiresAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("expires_at");

                    b.Property<bool>("IsRevoked")
                        .HasColumnType("boolean")
                        .HasColumnName("is_revoked");

                    b.Property<string>("Token")
                        .IsRequired()
                        .HasMaxLength(500)
                        .HasColumnType("character varying(500)")
                        .HasColumnName("token");

                    b.Property<Guid>("UserId")
                        .HasColumnType("uuid")
                        .HasColumnName("user_id");

                    b.HasKey("Id")
                        .HasName("pk_refresh_tokens");

                    b.HasIndex("Token")
                        .HasName("ix_refresh_tokens_token");

                    b.HasIndex("UserId")
                        .HasName("ix_refresh_tokens_user_id");

                    b.ToTable("refresh_tokens", (string)null);
                });

            modelBuilder.Entity("Core.Models.User", b =>
                {
                    b.Property<Guid>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("uuid")
                        .HasColumnName("id");

                    b.Property<DateTime>("CreatedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("created_at");

                    b.Property<string>("Email")
                        .IsRequired()
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)")
                        .HasColumnName("email");

                    b.Property<string>("FirstName")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)")
                        .HasColumnName("first_name");

                    b.Property<string>("LastName")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)")
                        .HasColumnName("last_name");

                    b.Property<string>("PasswordHash")
                        .IsRequired()
                        .HasColumnType("text")
                        .HasColumnName("password_hash");

                    b.Property<string>("PhoneNumber")
                        .HasColumnType("text")
                        .HasColumnName("phone_number");

                    b.Property<string>("Role")
                        .IsRequired()
                        .HasMaxLength(30)
                        .HasColumnType("character varying(30)")
                        .HasColumnName("role");

                    b.Property<DateTime?>("UpdatedAt")
                        .HasColumnType("timestamp with time zone")
                        .HasColumnName("updated_at");

                    b.HasKey("Id")
                        .HasName("pk_users");

                    b.HasIndex("Email")
                        .IsUnique()
                        .HasName("ix_users_email");

                    b.ToTable("users", (string)null);
                });

            modelBuilder.Entity("Core.Models.Issue", b =>
                {
                    b.HasOne("Core.Models.Property", "Property")
                        .WithMany("Issues")
                        .HasForeignKey("PropertyId")
                        .IsRequired()
                        .HasConstraintName("fk_issues_properties_property_id");

                    b.HasOne("Core.Models.User", "ReportedBy")
                        .WithMany("ReportedIssues")
                        .HasForeignKey("ReportedById")
                        .IsRequired()
                        .HasConstraintName("fk_issues_users_reported_by_id");

                    b.Navigation("Property");

                    b.Navigation("ReportedBy");
                });

            modelBuilder.Entity("Core.Models.Property", b =>
                {
                    b.HasOne("Core.Models.User", "CurrentTenant")
                        .WithMany()
                        .HasForeignKey("CurrentTenantId")
                        .HasConstraintName("fk_properties_users_current_tenant_id");

                    b.HasOne("Core.Models.User", "Owner")
                        .WithMany("OwnedProperties")
                        .HasForeignKey("OwnerId")
                        .IsRequired()
                        .HasConstraintName("fk_properties_users_owner_id");

                    b.Navigation("CurrentTenant");

                    b.Navigation("Owner");
                });

            modelBuilder.Entity("Core.Models.RefreshToken", b =>
                {
                    b.HasOne("Core.Models.User", "User")
                        .WithMany()
                        .HasForeignKey("UserId")
                        .IsRequired()
                        .HasConstraintName("fk_refresh_tokens_users_user_id");

                    b.Navigation("User");
                });

            modelBuilder.Entity("Core.Models.Property", b =>
                {
                    b.Navigation("Issues");
                });

            modelBuilder.Entity("Core.Models.User", b =>
                {
                    b.Navigation("OwnedProperties");

                    b.Navigation("ReportedIssues");
                });
#pragma warning restore 612, 618
        }
    }
}
