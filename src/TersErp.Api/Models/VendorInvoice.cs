using System;
using System.Collections.Generic;

namespace TersErp.Api.Models;

public class VendorInvoice : BaseEntity
{
    public required Guid VendorId { get; set; }
    public required string VendorName { get; set; }
    public required string InvoiceNumber { get; set; }
    public DateTime IssueDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(30);
    public decimal SubTotal { get; set; }
    public decimal VatAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public bool IsPaid { get; set; }
    public string Notes { get; set; } = string.Empty;
    public ICollection<VendorInvoiceLine> Lines { get; set; } = new List<VendorInvoiceLine>();
}
