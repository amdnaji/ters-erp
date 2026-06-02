using System;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SetupController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;

    public SetupController(IConfiguration configuration, IServiceProvider serviceProvider)
    {
        _configuration = configuration;
        _serviceProvider = serviceProvider;
    }

    // GET: api/setup/status
    [AllowAnonymous]
    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        var appDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "TersERP");
        var setupPath = Path.Combine(appDataFolder, "setup_complete.json");
        var isConfigured = System.IO.File.Exists(setupPath);
        return Ok(new { isConfigured });
    }

    // POST: api/setup/initialize
    [AllowAnonymous]
    [HttpPost("initialize")]
    public async Task<IActionResult> InitializeSystem(SetupInitializeDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var appDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "TersERP");
        var setupPath = Path.Combine(appDataFolder, "setup_complete.json");
        if (System.IO.File.Exists(setupPath))
        {
            return BadRequest(new { message = "تم تهيئة النظام مسبقاً. / System is already initialized." });
        }

        try
        {
            // 1. Build connection string and update appsettings.custom.json in User AppData
            string connectionString;
            if (dto.DbProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
            {
                connectionString = "Data Source=ters_erp_light.db";
            }
            else
            {
                connectionString = $"Host={dto.Host};Port={dto.Port ?? "5432"};Database={dto.Database};Username={dto.Username};Password={dto.Password}";
            }

            var customSettingsPath = Path.Combine(appDataFolder, "appsettings.custom.json");
            if (!System.IO.Directory.Exists(appDataFolder))
            {
                System.IO.Directory.CreateDirectory(appDataFolder);
            }
            
            var jsonString = System.IO.File.Exists(customSettingsPath) ? await System.IO.File.ReadAllTextAsync(customSettingsPath) : "{}";
            var rootNode = System.Text.Json.Nodes.JsonNode.Parse(jsonString) ?? new System.Text.Json.Nodes.JsonObject();
            
            rootNode["DatabaseProvider"] = dto.DbProvider;
            
            var connectionStringsNode = rootNode["ConnectionStrings"];
            if (connectionStringsNode == null)
            {
                rootNode["ConnectionStrings"] = new System.Text.Json.Nodes.JsonObject();
                connectionStringsNode = rootNode["ConnectionStrings"];
            }
            
            if (dto.DbProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
            {
                connectionStringsNode["SqliteConnection"] = connectionString;
            }
            else
            {
                connectionStringsNode["DefaultConnection"] = connectionString;
            }

            var writeOptions = new System.Text.Json.JsonSerializerOptions { WriteIndented = true };
            await System.IO.File.WriteAllTextAsync(customSettingsPath, rootNode.ToJsonString(writeOptions));

            // 2. Force configuration to reload instantly
            if (_configuration is IConfigurationRoot configRoot)
            {
                configRoot.Reload();
            }

            // 3. Resolve services in a newly spawned DI Scope to ensure they pick up the fresh connection configurations
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<TersDbContext>();
            var accountService = scope.ServiceProvider.GetRequiredService<IAccountService>();
            var securityService = scope.ServiceProvider.GetRequiredService<ISecurityService>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var signInManager = scope.ServiceProvider.GetRequiredService<SignInManager<ApplicationUser>>();

            // 4. Create Database structures dynamically
            if (dto.DbProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
            {
                await dbContext.Database.EnsureCreatedAsync();
            }
            else
            {
                // For PostgreSQL, apply EF database migrations to build tables dynamically
                await dbContext.Database.MigrateAsync();
            }

            // 5. Ensure tenant code uniqueness
            var tenantCodeExists = await dbContext.Tenants.AnyAsync(t => t.TenantCode == dto.TenantCode);
            if (tenantCodeExists)
            {
                return BadRequest(new { message = "رمز الشركة هذا مستخدم بالفعل، يرجى اختيار رمز آخر. / This company code is already taken, please choose another." });
            }

            // 6. Create Tenant record
            var tenant = new Tenant
            {
                Id = Guid.CreateVersion7(),
                Name = dto.CompanyName,
                TenantCode = dto.TenantCode,
                VatNumber = dto.VatNumber,
                EnableZatca = dto.EnableZatca
            };
            dbContext.Tenants.Add(tenant);
            await dbContext.SaveChangesAsync();

            // 7. Create Administrator User
            var user = new ApplicationUser
            {
                UserName = dto.AdminEmail,
                Email = dto.AdminEmail,
                TenantId = tenant.Id
            };
            
            var userResult = await userManager.CreateAsync(user, dto.AdminPassword);
            if (!userResult.Succeeded)
            {
                foreach (var error in userResult.Errors)
                {
                    ModelState.AddModelError("AdminPassword", error.Description);
                }
                return BadRequest(ModelState);
            }

            // 8. Add Tenant Claims for Auth session isolation
            await userManager.AddClaimAsync(user, new Claim("TenantId", tenant.Id.ToString()));

            // 9. Seed General Ledger Chart of Accounts
            await accountService.SeedChartOfAccountsAsync(tenant.Id);

            // 10. Seed Security roles and assign admin user
            await securityService.SeedTenantRolesAndAssignAdminAsync(tenant.Id, user.Id);

            // 11. Write lock file to block subsequent initializations
            await System.IO.File.WriteAllTextAsync(setupPath, System.Text.Json.JsonSerializer.Serialize(new
            {
                InitializedAt = DateTime.UtcNow,
                Provider = dto.DbProvider
            }));

            // 12. Sign in the newly created Admin immediately
            await signInManager.SignInAsync(user, isPersistent: true);

            return Ok(new { message = "تمت تهيئة نظام ترس بنجاح! / Ters ERP initialized successfully!" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "حدث خطأ أثناء تهيئة النظام. / An error occurred during initialization.", details = ex.Message });
        }
    }
}

public class SetupInitializeDto
{
    [Required]
    public string DbProvider { get; set; } = "SQLite"; // "SQLite" or "PostgreSQL"

    // PostgreSQL connection credentials (optional if SQLite)
    public string? Host { get; set; }
    public string? Port { get; set; }
    public string? Database { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }

    [Required]
    public string CompanyName { get; set; } = string.Empty;

    [Required]
    public string TenantCode { get; set; } = string.Empty;

    public string? VatNumber { get; set; }

    public bool EnableZatca { get; set; } = false;

    [Required]
    [EmailAddress]
    public string AdminEmail { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string AdminPassword { get; set; } = string.Empty;
}
