using Core.Models;
using Infrastructure.Extensions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace Infrastructure
{
    public class AppDbContext : IdentityDbContext<User, IdentityRole<Guid>, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<Property> Properties { get; set; }
        public DbSet<Issue> Issues { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<IssueComment> IssueComments { get; set; }
        public DbSet<IssuePhoto> IssuePhotos { get; set; }
        public DbSet<Message> Messages { get; set; }
        public DbSet<PropertyTenant> PropertyTenants { get; set; }
        public DbSet<LandlordServiceman> LandlordServicemen { get; set; }
        public DbSet<IssueServiceman> IssueServicemen { get; set; }
        public DbSet<PropertyDocument> PropertyDocuments { get; set; }
        public DbSet<UserInvitation> UserInvitations { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Konwencje PostgreSQL - snake_case dla nazw kolumn
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                // Zmiana nazwy tabeli na snake_case (jeśli potrzebne)
                entity.SetTableName(entity.GetTableName()?.ToSnakeCase());

                foreach (var property in entity.GetProperties())
                {
                    property.SetColumnName(property.GetColumnName().ToSnakeCase());
                }

                foreach (var key in entity.GetKeys())
                {
                    key.SetName(key.GetName()?.ToSnakeCase());
                }

                foreach (var foreignKey in entity.GetForeignKeys())
                {
                    foreignKey.SetConstraintName(foreignKey.GetConstraintName()?.ToSnakeCase());
                }

                foreach (var index in entity.GetIndexes())
                {
                    index.SetDatabaseName(index.GetDatabaseName()?.ToSnakeCase());
                }
            }

            // Konfiguracja User (dodatkowe właściwości)
            modelBuilder.Entity<User>(entity =>
            {
                entity.Property(e => e.FirstName).IsRequired().HasMaxLength(50);
                entity.Property(e => e.LastName).IsRequired().HasMaxLength(50);
            });

            // Konfiguracja Property
            modelBuilder.Entity<Property>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Address).IsRequired().HasMaxLength(200);
                entity.Property(e => e.City).IsRequired().HasMaxLength(100);
                entity.Property(e => e.PostalCode).HasMaxLength(10);

                // Explicit mapping dla Photos i Documents (JSON columns)
                entity.Property(e => e.Photos)
                    .HasColumnName("photos")
                    .HasColumnType("text")
                    .IsRequired();

                entity.Property(e => e.Documents)
                    .HasColumnName("documents")
                    .HasColumnType("text");

                entity.HasOne(e => e.Owner)
                    .WithMany(u => u.OwnedProperties)
                    .HasForeignKey(e => e.OwnerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja PropertyTenant (many-to-many)
            modelBuilder.Entity<PropertyTenant>(entity =>
            {
                entity.HasKey(pt => new { pt.PropertyId, pt.TenantId });

                entity.HasOne(pt => pt.Property)
                    .WithMany(p => p.Tenants)
                    .HasForeignKey(pt => pt.PropertyId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(pt => pt.Tenant)
                    .WithMany(u => u.TenantProperties)
                    .HasForeignKey(pt => pt.TenantId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja Issue
            modelBuilder.Entity<Issue>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Description).HasMaxLength(2000);
                entity.Property(e => e.Category).HasMaxLength(50);
                entity.Property(e => e.Priority).HasMaxLength(30);
                entity.Property(e => e.Status).HasMaxLength(30);

                entity.Property(e => e.Photos)
                    .HasConversion(
                        v => v != null && v.Count > 0 ? string.Join(',', v) : null,
                        v => string.IsNullOrEmpty(v) ? new List<string>() : v.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList()
                    );

                entity.HasOne(e => e.Property)
                    .WithMany(p => p.Issues)
                    .HasForeignKey(e => e.PropertyId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.ReportedBy)
                    .WithMany(u => u.ReportedIssues)
                    .HasForeignKey(e => e.ReportedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja IssueComment
            modelBuilder.Entity<IssueComment>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);

                entity.HasOne(e => e.Issue)
                    .WithMany(i => i.Comments)
                    .HasForeignKey(e => e.IssueId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Author)
                    .WithMany(u => u.Comments)
                    .HasForeignKey(e => e.AuthorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja IssuePhoto
            modelBuilder.Entity<IssuePhoto>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Url).IsRequired().HasMaxLength(500);
                entity.Property(e => e.UploadedAt).IsRequired();

                entity.HasOne(e => e.Issue)
                    .WithMany(i => i.PhotosWithMetadata)
                    .HasForeignKey(e => e.IssueId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.UploadedBy)
                    .WithMany()
                    .HasForeignKey(e => e.UploadedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja IssueServiceman (many-to-many)
            modelBuilder.Entity<IssueServiceman>(entity =>
            {
                entity.HasKey(iss => new { iss.IssueId, iss.ServicemanId });

                entity.HasOne(iss => iss.Issue)
                    .WithMany(i => i.AssignedServicemen)
                    .HasForeignKey(iss => iss.IssueId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(iss => iss.Serviceman)
                    .WithMany(u => u.AssignedIssues)
                    .HasForeignKey(iss => iss.ServicemanId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja Message
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Content).IsRequired().HasMaxLength(2000);

                entity.HasOne(e => e.Sender)
                    .WithMany(u => u.SentMessages)
                    .HasForeignKey(e => e.SenderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Receiver)
                    .WithMany(u => u.ReceivedMessages)
                    .HasForeignKey(e => e.ReceiverId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Konfiguracja LandlordServiceman (many-to-many)
            modelBuilder.Entity<LandlordServiceman>(entity =>
            {
                entity.HasKey(ls => new { ls.LandlordId, ls.ServicemanId });

                entity.HasOne(ls => ls.Landlord)
                    .WithMany(u => u.LandlordServicemen)
                    .HasForeignKey(ls => ls.LandlordId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(ls => ls.Serviceman)
                    .WithMany(u => u.ServicemanLandlords)
                    .HasForeignKey(ls => ls.ServicemanId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            //  Konfiguracja RefreshToken
            modelBuilder.Entity<RefreshToken>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Token).IsRequired().HasMaxLength(500);
                entity.Property(e => e.ExpiresAt).IsRequired();
                entity.Property(e => e.CreatedAt).IsRequired();
                entity.Property(e => e.IsRevoked).IsRequired();

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => e.Token);
            });

            // Konfiguracja PropertyDocument
            modelBuilder.Entity<PropertyDocument>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.DocumentType).IsRequired().HasMaxLength(50);
                entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(500);
                entity.Property(e => e.UploadedAt).IsRequired();
                entity.Property(e => e.Notes).HasMaxLength(1000);
                entity.Property(e => e.Version).IsRequired();
                entity.Property(e => e.IsLatest).IsRequired();

                entity.HasOne(e => e.Property)
                    .WithMany(p => p.PropertyDocuments)
                    .HasForeignKey(e => e.PropertyId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.UploadedBy)
                    .WithMany()
                    .HasForeignKey(e => e.UploadedById)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.PropertyId, e.DocumentType, e.IsLatest });
            });

            // Konfiguracja UserInvitation
            modelBuilder.Entity<UserInvitation>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.InvitationType).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(20);
                entity.Property(e => e.Message).HasMaxLength(500);

                entity.HasOne(e => e.Inviter)
                    .WithMany(u => u.SentInvitations)
                    .HasForeignKey(e => e.InviterId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Invitee)
                    .WithMany(u => u.ReceivedInvitations)
                    .HasForeignKey(e => e.InviteeId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasIndex(e => new { e.InviterId, e.InviteeId, e.InvitationType })
                    .IsUnique()
                    .HasFilter("status = 'Pending'");
            });
        }
    }
}
