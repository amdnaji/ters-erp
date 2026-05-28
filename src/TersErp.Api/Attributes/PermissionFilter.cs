using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using TersErp.Api.Data;
using TersErp.Api.Models;

namespace TersErp.Api.Attributes;

public class PermissionFilter : IAsyncActionFilter
{
    private readonly string _scope;
    private readonly string _action;
    private readonly TersDbContext _context;

    public PermissionFilter(string scope, string action, TersDbContext context)
    {
        _scope = scope;
        _action = action;
        _context = context;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;

        if (user?.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // Fetch user including their role and associated permission matrix (bypassing global query filter if necessary,
        // but since User is not BaseEntity, it doesn't have BaseEntity global filters.
        // Role is BaseEntity and has a global TenantId query filter, which correctly ensures we can only access roles of the active tenant!)
        var appUser = await _context.Users
            .Include(u => u.Role)
                .ThenInclude(r => r!.Permissions)
            .SingleOrDefaultAsync(u => u.Id == Guid.Parse(userIdClaim));

        if (appUser == null)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // If the user has a system Administrator role, they bypass all granular checks
        if (appUser.Role != null && appUser.Role.IsSystem && appUser.Role.Name == "Administrator")
        {
            await next();
            return;
        }

        if (appUser.Role == null)
        {
            context.Result = new ForbidResult();
            return;
        }

        var permission = appUser.Role.Permissions
            .FirstOrDefault(p => p.Scope.Equals(_scope, System.StringComparison.OrdinalIgnoreCase));

        if (permission == null)
        {
            context.Result = new ForbidResult();
            return;
        }

        bool hasAccess = false;
        switch (_action.ToLower())
        {
            case "create":
                hasAccess = permission.CanCreate;
                break;
            case "read":
            case "view":
                hasAccess = permission.CanRead;
                break;
            case "update":
                hasAccess = permission.CanUpdate;
                break;
            case "delete":
                hasAccess = permission.CanDelete;
                break;
        }

        if (!hasAccess)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
