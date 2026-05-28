using System;

namespace TersErp.Api.Models;

public class Employee : BaseEntity
{
    public required string Name { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; }
    public DateTime HireDate { get; set; } = DateTime.UtcNow;
}
