using Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure
{
	public class AppDbContext : DbContext
	{
		public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

		public DbSet<User> Users { get; set; }
		public DbSet<Property> Properties { get; set; }
		public DbSet<Issue> Issues { get; set; }

		protected override void OnModelCreating(ModelBuilder modelBuilder)
		{
			base.OnModelCreating(modelBuilder);

			// Konfiguracja User
			modelBuilder.Entity<User>(entity =>
			{
				entity.HasKey(e => e.Id);
				entity.Property(e => e.Email).IsRequired().HasMaxLength(100);
				entity.Property(e => e.FirstName).IsRequired().HasMaxLength(50);
				entity.Property(e => e.LastName).IsRequired().HasMaxLength(50);
				entity.Property(e => e.Role).IsRequired().HasMaxLength(30);
				entity.HasIndex(e => e.Email).IsUnique();
			});

			// Konfiguracja Property
			modelBuilder.Entity<Property>(entity =>
			{
				entity.HasKey(e => e.Id);
				entity.Property(e => e.Address).IsRequired().HasMaxLength(200);
				entity.Property(e => e.City).IsRequired().HasMaxLength(100);
				entity.Property(e => e.PostalCode).HasMaxLength(10);
				entity.Property(e => e.Area).HasColumnType("decimal(10,2)");

				entity.HasOne(e => e.Owner)
					.WithMany(u => u.OwnedProperties)
					.HasForeignKey(e => e.OwnerId)
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

				entity.HasOne(e => e.Property)
					.WithMany(p => p.Issues)
					.HasForeignKey(e => e.PropertyId)
					.OnDelete(DeleteBehavior.Cascade);

				entity.HasOne(e => e.ReportedBy)
					.WithMany(u => u.ReportedIssues)
					.HasForeignKey(e => e.ReportedById)
					.OnDelete(DeleteBehavior.Restrict);
			});
		}
	}
}
