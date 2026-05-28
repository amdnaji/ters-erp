using System;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Data;

public class TersDbContext : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>
{
    private readonly ITenantService _tenantService;

    public TersDbContext(DbContextOptions<TersDbContext> options, ITenantService tenantService)
        : base(options)
    {
        _tenantService = tenantService;
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<ApplicationRole> TenantRoles => Set<ApplicationRole>(); // Keep named TenantRoles for compat
    public DbSet<ApplicationRole> ApplicationRoles => Set<ApplicationRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceLine> InvoiceLines => Set<InvoiceLine>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<VendorInvoice> VendorInvoices => Set<VendorInvoice>();
    public DbSet<VendorInvoiceLine> VendorInvoiceLines => Set<VendorInvoiceLine>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<PayrollSlip> PayrollSlips => Set<PayrollSlip>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Explicitly rename all ASP.NET Identity tables to remove the "AspNet" prefix, and force singular snake_case (except users table)
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            if (entity.ClrType == typeof(ApplicationUser))
            {
                entity.SetTableName("users");
            }
            else if (entity.ClrType == typeof(ApplicationRole))
            {
                entity.SetTableName("role");
            }
            else if (entity.ClrType == typeof(IdentityUserClaim<Guid>))
            {
                entity.SetTableName("user_claim");
            }
            else if (entity.ClrType == typeof(IdentityUserRole<Guid>))
            {
                entity.SetTableName("user_role");
            }
            else if (entity.ClrType == typeof(IdentityUserLogin<Guid>))
            {
                entity.SetTableName("user_login");
            }
            else if (entity.ClrType == typeof(IdentityRoleClaim<Guid>))
            {
                entity.SetTableName("role_claim");
            }
            else if (entity.ClrType == typeof(IdentityUserToken<Guid>))
            {
                entity.SetTableName("user_token");
            }
            else
            {
                // Force singular snake_case naming for standard entities
                var singularName = entity.ClrType.Name;
                entity.SetTableName(ToSnakeCase(singularName));
            }
        }

        // Apply Global Query Filters for BaseEntity using GetCurrentTenantId()
        foreach (var entityType in builder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                ConfigureTenantFilterForBaseEntity(builder, entityType.ClrType);
            }
        }

        // Configure self-referencing relationship and unique index for Account entity
        builder.Entity<Account>(entity =>
        {
            entity.HasOne(a => a.Parent)
                  .WithMany(a => a.Children)
                  .HasForeignKey(a => a.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(a => new { a.TenantId, a.Code })
                  .IsUnique();
        });

        // Configure unique index for TenantCode in Tenant entity
        builder.Entity<Tenant>(entity =>
        {
            entity.HasIndex(t => t.TenantCode)
                  .IsUnique();
        });

        // Configure ApplicationRole relationships
        builder.Entity<ApplicationRole>(entity =>
        {
            entity.HasMany(r => r.Permissions)
                  .WithOne(p => p.Role)
                  .HasForeignKey(p => p.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Tenant>()
                  .WithMany()
                  .HasForeignKey(r => r.TenantId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure ApplicationUser to TenantRole relationship
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.HasOne(u => u.Role)
                  .WithMany()
                  .HasForeignKey(u => u.RoleId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }

    public override int SaveChanges()
    {
        ApplyTenantAndAuditProperties();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantAndAuditProperties();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantAndAuditProperties()
    {
        var currentTenantId = _tenantService.GetCurrentTenantId();
        var utcNow = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is BaseEntity baseEntity)
            {
                if (entry.State == EntityState.Added)
                {
                    baseEntity.CreatedAt = utcNow;
                    if (baseEntity.TenantId == Guid.Empty)
                    {
                        baseEntity.TenantId = currentTenantId;
                    }
                }
                else if (entry.State == EntityState.Modified)
                {
                    baseEntity.UpdatedAt = utcNow;
                }
            }

            if (entry.Entity is ApplicationUser user)
            {
                if (entry.State == EntityState.Added)
                {
                    if (user.TenantId == Guid.Empty)
                    {
                        user.TenantId = currentTenantId;
                    }
                }
            }
        }
    }

    private void ConfigureTenantFilterForBaseEntity(ModelBuilder builder, Type entityType)
    {
        var method = typeof(TersDbContext)
            .GetMethod(nameof(ApplyBaseEntityFilter), BindingFlags.NonPublic | BindingFlags.Instance)?
            .MakeGenericMethod(entityType);

        method?.Invoke(this, new object[] { builder });
    }

    private void ApplyBaseEntityFilter<T>(ModelBuilder builder) where T : BaseEntity
    {
        builder.Entity<T>().HasQueryFilter(e => e.TenantId == _tenantService.GetCurrentTenantId());
    }



    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        
        var result = Regex.Replace(input, "([a-z0-9])([A-Z])", "$1_$2").ToLower();
        return result;
    }
}
