using System;

namespace TersErp.Api.Models;

public class InvoiceLine : BaseEntity
{
    public required Guid InvoiceId { get; set; }
    public required string ItemDescription { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}
