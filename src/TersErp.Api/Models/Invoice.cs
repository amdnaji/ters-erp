using System;
using System.Collections.Generic;

namespace TersErp.Api.Models;

public class Invoice : BaseEntity
{
    public required Guid CustomerId { get; set; }
    public required string CustomerName { get; set; }
    public required string InvoiceNumber { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public decimal SubTotal { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public string Notes { get; set; } = string.Empty;
    public ICollection<InvoiceLine> Lines { get; set; } = new List<InvoiceLine>();
}
