using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;

namespace TersErp.Api.Models;

public class ApplicationRole : IdentityRole<Guid>
{
    public Guid TenantId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();

    public ApplicationRole()
    {
        Id = Guid.CreateVersion7();
    }
}
