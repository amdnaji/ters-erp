using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TersErp.Api.Attributes;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SecurityController : ControllerBase
{
    private readonly ISecurityService _securityService;

    public SecurityController(ISecurityService securityService)
    {
        _securityService = securityService;
    }

    // GET: api/security/roles
    [HttpGet("roles")]
    [HasPermission("Users", "Read")]
    public async Task<ActionResult<IEnumerable<ApplicationRole>>> GetRoles()
    {
        var roles = await _securityService.GetRolesAsync();
        return Ok(roles);
    }

    // GET: api/security/roles/{id}
    [HttpGet("roles/{id}")]
    [HasPermission("Users", "Read")]
    public async Task<ActionResult<ApplicationRole>> GetRole(Guid id)
    {
        var role = await _securityService.GetRoleByIdAsync(id);
        if (role == null)
        {
            return NotFound();
        }
        return Ok(role);
    }

    // POST: api/security/roles
    [HasPermission("Users", "Create")]
    [HttpPost("roles")]
    public async Task<ActionResult<ApplicationRole>> CreateRole(CreateRoleDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var role = await _securityService.CreateRoleAsync(dto.Name, dto.Description, dto.Permissions);
        return CreatedAtAction(nameof(GetRole), new { id = role.Id }, role);
    }

    // PUT: api/security/roles/{id}
    [HasPermission("Users", "Update")]
    [HttpPut("roles/{id}")]
    public async Task<ActionResult<ApplicationRole>> UpdateRole(Guid id, UpdateRoleDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var role = await _securityService.UpdateRolePermissionsAsync(id, dto.Name, dto.Description, dto.Permissions);
            return Ok(role);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE: api/security/roles/{id}
    [HasPermission("Users", "Delete")]
    [HttpDelete("roles/{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        try
        {
            await _securityService.DeleteRoleAsync(id);
            return Ok(new { message = "تم حذف الدور الوظيفي بنجاح." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET: api/security/users
    [HasPermission("Users", "Read")]
    [HttpGet("users")]
    public async Task<ActionResult<IEnumerable<UserWithRoleDto>>> GetUsers()
    {
        var users = await _securityService.GetTenantUsersAsync();
        return Ok(users);
    }

    // POST: api/security/users
    [HasPermission("Users", "Create")]
    [HttpPost("users")]
    public async Task<ActionResult<UserWithRoleDto>> CreateUser(CreateUserDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var user = await _securityService.CreateUserAsync(dto.Email, dto.Password, dto.RoleId);
            return Ok(user);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // PUT: api/security/users/{id}/role
    [HasPermission("Users", "Update")]
    [HttpPut("users/{id}/role")]
    public async Task<IActionResult> AssignUserRole(Guid id, AssignUserRoleDto dto)
    {
        try
        {
            await _securityService.AssignUserRoleAsync(id, dto.RoleId);
            return Ok(new { message = "تم تحديث الدور الوظيفي للمستخدم بنجاح." });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

// ==========================================
// DTOs for SecurityController
// ==========================================

public class CreateRoleDto
{
    [Required(ErrorMessage = "اسم الدور مطلوب")]
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [Required]
    public List<RolePermissionDto> Permissions { get; set; } = new();
}

public class UpdateRoleDto
{
    [Required(ErrorMessage = "اسم الدور مطلوب")]
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [Required]
    public List<RolePermissionDto> Permissions { get; set; } = new();
}

public class CreateUserDto
{
    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    [MinLength(8, ErrorMessage = "يجب ألا تقل كلمة المرور عن 8 خانات")]
    public string Password { get; set; } = string.Empty;

    public Guid? RoleId { get; set; }
}

public class AssignUserRoleDto
{
    public Guid? RoleId { get; set; }
}
