using System;

namespace TersErp.Api.Models;

public class Tenant
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    
    public required string Name { get; set; }
    
    public required string TenantCode { get; set; }
    
    public string? VatNumber { get; set; }
    
    public bool EnableZatca { get; set; } = false;
    
    public string? ZatcaPrivateKey { get; set; }
    
    public string? ZatcaCertificate { get; set; }
    
    public string? ZatcaSecret { get; set; }
    
    public string? ZatcaEnvironment { get; set; } // "Sandbox", "Simulation", "Production"
    
    public int ZatcaInvoiceCounter { get; set; } = 0;
}
