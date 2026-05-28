using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly TersDbContext _context;
    private readonly IAccountService _accountService;
    private readonly ISecurityService _securityService;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        TersDbContext context,
        IAccountService accountService,
        ISecurityService securityService)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _context = context;
        _accountService = accountService;
        _securityService = securityService;
    }

    // POST: api/auth/register
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterTenantDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Check if TenantCode already exists to enforce uniqueness
        var tenantCodeExists = await _context.Tenants.AnyAsync(t => t.TenantCode == dto.TenantCode);
        if (tenantCodeExists)
        {
            return BadRequest(new { message = "رمز الشركة هذا مستخدم بالفعل، يرجى اختيار رمز آخر. / This company code is already taken, please choose another." });
        }

        // Execute registration as a transaction to avoid partial success/dirty states
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Create the Tenant record
            var tenant = new Tenant
            {
                Id = Guid.CreateVersion7(),
                Name = dto.CompanyName,
                TenantCode = dto.TenantCode
            };
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync();

            // 2. Create the Admin User associated with the Tenant
            var user = new ApplicationUser
            {
                UserName = dto.AdminEmail,
                Email = dto.AdminEmail,
                TenantId = tenant.Id
            };
            
            var userResult = await _userManager.CreateAsync(user, dto.Password);
            if (!userResult.Succeeded)
            {
                await transaction.RollbackAsync();
                foreach (var error in userResult.Errors)
                {
                    ModelState.AddModelError("Password", error.Description);
                }
                return BadRequest(ModelState);
            }

            // 3. Add Custom TenantId Claim so that the cookie inherits it and handles ITenantService reads automatically
            var claimResult = await _userManager.AddClaimAsync(user, new Claim("TenantId", tenant.Id.ToString()));
            if (!claimResult.Succeeded)
            {
                await transaction.RollbackAsync();
                foreach (var error in claimResult.Errors)
                {
                    ModelState.AddModelError("General", error.Description);
                }
                return BadRequest(ModelState);
            }

            // 4. Automatically seed the standard simplified Chart of Accounts for the new Tenant
            await _accountService.SeedChartOfAccountsAsync(tenant.Id);

            // 5. Automatically seed Default Roles and assign this Admin User to the Administrator Role
            await _securityService.SeedTenantRolesAndAssignAdminAsync(tenant.Id, user.Id);

            // Commit the full transaction safely
            await transaction.CommitAsync();

            return Ok(new { message = "تم تسجيل الشركة وإنشاء دليل الحسابات وأدوار النظام بنجاح." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return BadRequest(new { message = "حدث خطأ غير متوقع أثناء التسجيل.", details = ex.Message });
        }
    }



    // POST: api/auth/login
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // 1. Verify that the Tenant exists by TenantCode
        var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.TenantCode == dto.TenantCode);
        if (tenant == null)
        {
            return Unauthorized(new { message = "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }

        // 2. Retrieve user globally (since query filter is removed from ApplicationUser)
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return Unauthorized(new { message = "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }

        // 3. Enforce tenant isolation boundary
        if (user.TenantId != tenant.Id)
        {
            return Unauthorized(new { message = "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }

        // 4. Authenticate using SignInManager (respecting RememberMe checkbox)
        var result = await _signInManager.PasswordSignInAsync(user, dto.Password, isPersistent: dto.RememberMe, lockoutOnFailure: false);
        if (!result.Succeeded)
        {
            return Unauthorized(new { message = "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        }

        // 5. Auto-heal legacy database entries (created before permissions migration)
        var rolesExist = await _context.TenantRoles
            .IgnoreQueryFilters()
            .AnyAsync(r => r.TenantId == user.TenantId);

        if (!rolesExist)
        {
            await _securityService.SeedTenantRolesAndAssignAdminAsync(user.TenantId, user.Id);
        }

        var appUser = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r!.Permissions)
            .SingleOrDefaultAsync(u => u.Id == user.Id);

        if (appUser != null && appUser.RoleId == null)
        {
            var adminRole = await _context.TenantRoles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.TenantId == appUser.TenantId && r.RoleName == "Administrator");
            if (adminRole != null)
            {
                appUser.RoleId = adminRole.Id;
                await _context.SaveChangesAsync();
                
                // Reload role
                appUser = await _context.Users
                    .Include(u => u.Role)
                        .ThenInclude(r => r!.Permissions)
                    .SingleOrDefaultAsync(u => u.Id == user.Id);
            }
        }

        var permissionsDict = new Dictionary<string, object>();
        string? roleName = null;

        if (appUser?.Role != null)
        {
            roleName = appUser.Role.RoleName;
            var scopes = new[] { "ChartOfAccounts", "JournalEntries", "Users", "CompanySettings" };
            foreach (var scope in scopes)
            {
                if (appUser.Role.IsSystem && appUser.Role.RoleName == "Administrator")
                {
                    permissionsDict[scope] = new { create = true, read = true, update = true, delete = true };
                }
                else
                {
                    var perm = appUser.Role.Permissions.FirstOrDefault(p => p.Scope.Equals(scope, StringComparison.OrdinalIgnoreCase));
                    permissionsDict[scope] = new
                    {
                        create = perm?.CanCreate ?? false,
                        read = perm?.CanRead ?? false,
                        update = perm?.CanUpdate ?? false,
                        delete = perm?.CanDelete ?? false
                    };
                }
            }
        }

        return Ok(new
        {
            email = user.Email,
            tenantId = user.TenantId,
            roleName = roleName,
            permissions = permissionsDict
        });
    }

    // POST: api/auth/logout
    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await _signInManager.SignOutAsync();
        return Ok(new { message = "تم تسجيل الخروج بنجاح." });
    }

    // GET: api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized();
        }

        var user = await _userManager.FindByIdAsync(userIdClaim);
        if (user == null)
        {
            return Unauthorized();
        }

        // Auto-heal legacy database entries (created before permissions migration)
        var rolesExist = await _context.TenantRoles
            .IgnoreQueryFilters()
            .AnyAsync(r => r.TenantId == user.TenantId);

        if (!rolesExist)
        {
            await _securityService.SeedTenantRolesAndAssignAdminAsync(user.TenantId, user.Id);
        }

        var appUser = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r!.Permissions)
            .SingleOrDefaultAsync(u => u.Id == user.Id);

        if (appUser != null && appUser.RoleId == null)
        {
            var adminRole = await _context.TenantRoles
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(r => r.TenantId == appUser.TenantId && r.RoleName == "Administrator");
            if (adminRole != null)
            {
                appUser.RoleId = adminRole.Id;
                await _context.SaveChangesAsync();
                
                // Reload role
                appUser = await _context.Users
                    .Include(u => u.Role)
                        .ThenInclude(r => r!.Permissions)
                    .SingleOrDefaultAsync(u => u.Id == user.Id);
            }
        }

        var permissionsDict = new Dictionary<string, object>();
        string? roleName = null;

        if (appUser?.Role != null)
        {
            roleName = appUser.Role.RoleName;
            var scopes = new[] { "ChartOfAccounts", "JournalEntries", "Users", "CompanySettings" };
            foreach (var scope in scopes)
            {
                if (appUser.Role.IsSystem && appUser.Role.RoleName == "Administrator")
                {
                    permissionsDict[scope] = new { create = true, read = true, update = true, delete = true };
                }
                else
                {
                    var perm = appUser.Role.Permissions.FirstOrDefault(p => p.Scope.Equals(scope, StringComparison.OrdinalIgnoreCase));
                    permissionsDict[scope] = new
                    {
                        create = perm?.CanCreate ?? false,
                        read = perm?.CanRead ?? false,
                        update = perm?.CanUpdate ?? false,
                        delete = perm?.CanDelete ?? false
                    };
                }
            }
        }

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            tenantId = user.TenantId,
            roleName = roleName,
            permissions = permissionsDict
        });
    }
}

// ==========================================
// DTO Records for AuthController
// ==========================================

public record RegisterTenantDto(
    [Required(ErrorMessage = "اسم الشركة مطلوب")]
    string CompanyName,

    [Required(ErrorMessage = "رمز الشركة مطلوب")]
    [RegularExpression("^[a-zA-Z0-9]+$", ErrorMessage = "يجب أن يتكون رمز الشركة من أحرف وأرقام فقط بالإنجليزية")]
    string TenantCode,

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    string AdminEmail,

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    [MinLength(8, ErrorMessage = "يجب ألا تقل كلمة المرور عن 8 خانات")]
    string Password
);

public record LoginDto(
    [Required(ErrorMessage = "رمز الشركة مطلوب")]
    string TenantCode,

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    string Email,

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    string Password,

    bool RememberMe = true
);
