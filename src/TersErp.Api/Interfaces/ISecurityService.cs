using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TersErp.Api.Models;

namespace TersErp.Api.Interfaces;

public interface ISecurityService
{
    Task SeedTenantRolesAndAssignAdminAsync(Guid tenantId, Guid adminUserId);
    Task<IEnumerable<ApplicationRole>> GetRolesAsync();
    Task<ApplicationRole?> GetRoleByIdAsync(Guid id);
    Task<ApplicationRole> CreateRoleAsync(string name, string description, List<RolePermissionDto> permissions);
    Task<ApplicationRole> UpdateRolePermissionsAsync(Guid roleId, string name, string description, List<RolePermissionDto> permissions);
    Task DeleteRoleAsync(Guid roleId);
    Task<IEnumerable<UserWithRoleDto>> GetTenantUsersAsync();
    Task<UserWithRoleDto> CreateUserAsync(string email, string password, Guid? roleId);
    Task AssignUserRoleAsync(Guid userId, Guid? roleId);
}

public record RolePermissionDto(
    string Scope,
    bool CanCreate,
    bool CanRead,
    bool CanUpdate,
    bool CanDelete
);

public record UserWithRoleDto(
    Guid Id,
    string Email,
    Guid? RoleId,
    string? RoleName
);
