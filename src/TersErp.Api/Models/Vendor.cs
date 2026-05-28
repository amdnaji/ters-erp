using System;

namespace TersErp.Api.Models;

public class Vendor : BaseEntity
{
    public required string Name { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}
