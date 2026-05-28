using System;

namespace TersErp.Api.Models;

public class VendorInvoiceLine : BaseEntity
{
    public required Guid VendorInvoiceId { get; set; }
    public required string ItemDescription { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
