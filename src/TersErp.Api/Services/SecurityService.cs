using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Services;

public class SecurityService : ISecurityService
{
    private readonly TersDbContext _context;
    private readonly ITenantService _tenantService;
    private readonly UserManager<ApplicationUser> _userManager;

    public SecurityService(TersDbContext context, ITenantService tenantService, UserManager<ApplicationUser> userManager)
    {
        _context = context;
        _tenantService = tenantService;
        _userManager = userManager;
    }

    public async Task SeedTenantRolesAndAssignAdminAsync(Guid tenantId, Guid adminUserId)
    {
        // Check if roles are already seeded
        var rolesExist = await _context.TenantRoles
            .IgnoreQueryFilters()
            .AnyAsync(r => r.TenantId == tenantId);

        if (rolesExist) return;

        // 1. Create Administrator Role
        var adminRole = new ApplicationRole
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            RoleName = "Administrator",
            Name = $"Administrator_{tenantId}",
            NormalizedName = $"ADMINISTRATOR_{tenantId}".ToUpperInvariant(),
            Description = "مدير النظام - كامل الصلاحيات لجميع النطاقات والعمليات.",
            IsSystem = true,
            CreatedAt = DateTime.UtcNow
        };

        var scopes = new[] { "ChartOfAccounts", "JournalEntries", "Users", "CompanySettings" };

        foreach (var scope in scopes)
        {
            adminRole.Permissions.Add(new RolePermission
            {
                Id = Guid.CreateVersion7(),
                TenantId = tenantId,
                Scope = scope,
                CanCreate = true,
                CanRead = true,
                CanUpdate = true,
                CanDelete = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        // 2. Create Accountant Role
        var accountantRole = new ApplicationRole
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            RoleName = "Accountant",
            Name = $"Accountant_{tenantId}",
            NormalizedName = $"ACCOUNTANT_{tenantId}".ToUpperInvariant(),
            Description = "محاسب مالي - إدخال وتعديل اليوميات ودليل الحسابات دون صلاحية حذفها أو إدارة المستخدمين.",
            IsSystem = false,
            CreatedAt = DateTime.UtcNow
        };

        accountantRole.Permissions.Add(new RolePermission
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Scope = "ChartOfAccounts",
            CanCreate = true,
            CanRead = true,
            CanUpdate = true,
            CanDelete = false,
            CreatedAt = DateTime.UtcNow
        });

        accountantRole.Permissions.Add(new RolePermission
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Scope = "JournalEntries",
            CanCreate = true,
            CanRead = true,
            CanUpdate = true,
            CanDelete = false,
            CreatedAt = DateTime.UtcNow
        });

        accountantRole.Permissions.Add(new RolePermission
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Scope = "Users",
            CanCreate = false,
            CanRead = false,
            CanUpdate = false,
            CanDelete = false,
            CreatedAt = DateTime.UtcNow
        });

        accountantRole.Permissions.Add(new RolePermission
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Scope = "CompanySettings",
            CanCreate = false,
            CanRead = true,
            CanUpdate = false,
            CanDelete = false,
            CreatedAt = DateTime.UtcNow
        });

        // 3. Create Auditor Role
        var auditorRole = new ApplicationRole
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            RoleName = "Auditor",
            Name = $"Auditor_{tenantId}",
            NormalizedName = $"AUDITOR_{tenantId}".ToUpperInvariant(),
            Description = "مراجع مالي - استعراض وقراءة جميع السجلات والتقارير المالية دون أي صلاحية تعديل.",
            IsSystem = false,
            CreatedAt = DateTime.UtcNow
        };

        foreach (var scope in scopes)
        {
            auditorRole.Permissions.Add(new RolePermission
            {
                Id = Guid.CreateVersion7(),
                TenantId = tenantId,
                Scope = scope,
                CanCreate = false,
                CanRead = scope != "Users", // Don't allow viewing users list for auditors
                CanUpdate = false,
                CanDelete = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Add roles to context bypassing current tenant filters
        _context.TenantRoles.Add(adminRole);
        _context.TenantRoles.Add(accountantRole);
        _context.TenantRoles.Add(auditorRole);
        await _context.SaveChangesAsync();

        // Assign the administrator user to the adminRole
        var adminUser = await _context.Users
            .IgnoreQueryFilters()
            .SingleOrDefaultAsync(u => u.Id == adminUserId);

        if (adminUser != null)
        {
            adminUser.RoleId = adminRole.Id;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<ApplicationRole>> GetRolesAsync()
    {
        return await _context.TenantRoles
            .Include(r => r.Permissions)
            .OrderBy(r => r.IsSystem ? 0 : 1)
            .ThenBy(r => r.RoleName)
            .ToListAsync();
    }

    public async Task<ApplicationRole?> GetRoleByIdAsync(Guid id)
    {
        return await _context.TenantRoles
            .Include(r => r.Permissions)
            .SingleOrDefaultAsync(r => r.Id == id);
    }

    public async Task<ApplicationRole> CreateRoleAsync(string name, string description, List<RolePermissionDto> permissions)
    {
        var tenantId = _tenantService.GetCurrentTenantId();

        var role = new ApplicationRole
        {
            RoleName = name,
            Name = $"{name}_{tenantId}",
            NormalizedName = $"{name}_{tenantId}".ToUpperInvariant(),
            Description = description,
            IsSystem = false,
            TenantId = tenantId
        };

        foreach (var p in permissions)
        {
            role.Permissions.Add(new RolePermission
            {
                Scope = p.Scope,
                CanCreate = p.CanCreate,
                CanRead = p.CanRead,
                CanUpdate = p.CanUpdate,
                CanDelete = p.CanDelete,
                TenantId = tenantId
            });
        }

        _context.TenantRoles.Add(role);
        await _context.SaveChangesAsync();
        return role;
    }

    public async Task<ApplicationRole> UpdateRolePermissionsAsync(Guid roleId, string name, string description, List<RolePermissionDto> permissions)
    {
        var role = await _context.TenantRoles
            .Include(r => r.Permissions)
            .SingleOrDefaultAsync(r => r.Id == roleId);

        if (role == null)
        {
            throw new KeyNotFoundException("الدور المالي المطلوب غير موجود. / The requested role does not exist.");
        }

        if (role.IsSystem && role.RoleName == "Administrator")
        {
            throw new InvalidOperationException("لا يمكن تعديل صلاحيات مدير النظام الافتراضي. / Cannot modify permissions of the system administrator role.");
        }

        // Update details
        var tenantId = _tenantService.GetCurrentTenantId();
        role.RoleName = name;
        role.Name = $"{name}_{tenantId}";
        role.NormalizedName = $"{name}_{tenantId}".ToUpperInvariant();
        role.Description = description;

        // Update permissions matrix
        foreach (var p in permissions)
        {
            var existing = role.Permissions.FirstOrDefault(ep => ep.Scope.Equals(p.Scope, StringComparison.OrdinalIgnoreCase));
            if (existing != null)
            {
                existing.CanCreate = p.CanCreate;
                existing.CanRead = p.CanRead;
                existing.CanUpdate = p.CanUpdate;
                existing.CanDelete = p.CanDelete;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                role.Permissions.Add(new RolePermission
                {
                    Scope = p.Scope,
                    CanCreate = p.CanCreate,
                    CanRead = p.CanRead,
                    CanUpdate = p.CanUpdate,
                    CanDelete = p.CanDelete,
                    TenantId = tenantId
                });
            }
        }

        await _context.SaveChangesAsync();
        return role;
    }

    public async Task DeleteRoleAsync(Guid roleId)
    {
        var role = await _context.TenantRoles.SingleOrDefaultAsync(r => r.Id == roleId);
        if (role == null)
        {
            throw new KeyNotFoundException("الدور المالي المطلوب غير موجود. / The requested role does not exist.");
        }

        if (role.IsSystem)
        {
            throw new InvalidOperationException("لا يمكن حذف أدوار النظام الافتراضية. / System roles cannot be deleted.");
        }

        // Check if any user is currently assigned to this role
        var usersAssigned = await _context.Users.AnyAsync(u => u.RoleId == roleId);
        if (usersAssigned)
        {
            throw new InvalidOperationException("لا يمكن حذف هذا الدور لوجود مستخدمين مرتبطين به حالياً. / Cannot delete role because users are currently assigned to it.");
        }

        _context.TenantRoles.Remove(role);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<UserWithRoleDto>> GetTenantUsersAsync()
    {
        var currentTenantId = _tenantService.GetCurrentTenantId();
        
        var users = await _context.Users
            .Include(u => u.Role)
            .Where(u => u.TenantId == currentTenantId)
            .OrderBy(u => u.Email)
            .ToListAsync();

        return users.Select(u => new UserWithRoleDto(
            u.Id,
            u.Email ?? string.Empty,
            u.RoleId,
            u.Role?.RoleName
        ));
    }

    public async Task<UserWithRoleDto> CreateUserAsync(string email, string password, Guid? roleId)
    {
        var tenantId = _tenantService.GetCurrentTenantId();

        var existing = await _userManager.FindByEmailAsync(email);
        if (existing != null)
        {
            throw new ArgumentException("المستخدم مسجل بالفعل في النظام. / User already exists.");
        }

        if (roleId.HasValue)
        {
            var roleExists = await _context.TenantRoles.AnyAsync(r => r.Id == roleId.Value);
            if (!roleExists)
            {
                throw new KeyNotFoundException("الدور المالي المختار غير موجود. / The selected role does not exist.");
            }
        }

        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            TenantId = tenantId,
            RoleId = roleId
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var error = string.Join(" | ", result.Errors.Select(e => e.Description));
            throw new ArgumentException(error);
        }

        await _userManager.AddClaimAsync(user, new Claim("TenantId", tenantId.ToString()));

        var roleName = roleId.HasValue 
            ? (await _context.TenantRoles.FindAsync(roleId.Value))?.RoleName 
            : null;

        return new UserWithRoleDto(user.Id, user.Email ?? string.Empty, user.RoleId, roleName);
    }

    public async Task AssignUserRoleAsync(Guid userId, Guid? roleId)
    {
        var currentTenantId = _tenantService.GetCurrentTenantId();

        var user = await _context.Users.SingleOrDefaultAsync(u => u.Id == userId && u.TenantId == currentTenantId);
        if (user == null)
        {
            throw new KeyNotFoundException("المستخدم المطلوب غير موجود في شركتكم. / The requested user does not exist in your tenant.");
        }

        if (roleId.HasValue)
        {
            var roleExists = await _context.TenantRoles.AnyAsync(r => r.Id == roleId.Value);
            if (!roleExists)
            {
                throw new KeyNotFoundException("الدور المالي المختار غير موجود. / The selected role does not exist.");
            }
        }

        user.RoleId = roleId;
        await _context.SaveChangesAsync();
    }
}
