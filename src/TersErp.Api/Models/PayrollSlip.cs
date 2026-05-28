using System;

namespace TersErp.Api.Models;

public class PayrollSlip : BaseEntity
{
    public required Guid EmployeeId { get; set; }
    public required string EmployeeName { get; set; }
    public int Month { get; set; }
    public int Year { get; set; }
    public decimal GrossSalary { get; set; }
    public decimal Deductions { get; set; }
    public decimal NetSalary { get; set; }
    public bool IsPaid { get; set; }
}
