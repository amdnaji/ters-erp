using System;

namespace TersErp.Api.Models;

public class Tenant
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    
    public required string Name { get; set; }
    
    public required string TenantCode { get; set; }
}
