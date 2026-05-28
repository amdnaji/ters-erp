using System;

namespace TersErp.Api.Models;

public class Customer : BaseEntity
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Phone { get; set; }
}
