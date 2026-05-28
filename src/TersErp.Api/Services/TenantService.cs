using System;
using Microsoft.AspNetCore.Http;
using TersErp.Api.Interfaces;

namespace TersErp.Api.Services;

public class TenantService : ITenantService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    
    // Constant dummy/default tenant ID for testing/development
    public static readonly Guid DefaultTenantId = Guid.Parse("018f6c4d-2a1f-7b3b-8524-ec40a02f6b4d");

    public TenantService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid GetCurrentTenantId()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext == null)
        {
            return DefaultTenantId;
        }

        // 1. Try to read from HTTP Header "X-Tenant-Id"
        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdStr) &&
            Guid.TryParse(tenantIdStr, out var tenantIdFromHeader))
        {
            return tenantIdFromHeader;
        }

        // 2. Try to read from User claims (e.g. if the user is authenticated and has a TenantId claim)
        var tenantIdClaim = httpContext.User?.FindFirst("TenantId")?.Value;
        if (!string.IsNullOrEmpty(tenantIdClaim) && Guid.TryParse(tenantIdClaim, out var tenantIdFromClaim))
        {
            return tenantIdFromClaim;
        }

        // 3. Fallback to default tenant ID for development
        return DefaultTenantId;
    }
}
