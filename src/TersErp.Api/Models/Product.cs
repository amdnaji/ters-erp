using System;

namespace TersErp.Api.Models;

public class Product : BaseEntity
{
    public required string Name { get; set; }
    public required string Sku { get; set; }
    public string Barcode { get; set; } = string.Empty;
    public decimal PurchasePrice { get; set; }
    public decimal SalesPrice { get; set; }
    public decimal StockQuantity { get; set; }
}
