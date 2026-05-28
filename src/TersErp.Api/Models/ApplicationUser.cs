using System;
using Microsoft.AspNetCore.Identity;

namespace TersErp.Api.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }
    public Guid? RoleId { get; set; }

    public ApplicationRole? Role { get; set; }

    public ApplicationUser()
    {
        Id = Guid.CreateVersion7();
    }
}
