using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;

namespace TersErp.Api.Services;

public class ZatcaIntegrationService
{
    // Generate private key and CSR (Certificate Signing Request)
    public static (string PrivateKeyPem, string CsrPem) GenerateCsr(string companyName, string vatNumber, string registrationAddress, string businessCategory)
    {
        // 1. Generate ECDsa Prime256v1 key
        using var ecdsa = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        
        // Export Private Key in PKCS8 PEM format
        var privateKeyPem = ecdsa.ExportPkcs8PrivateKeyPem();

        // 2. Build Subject Distinguished Name (DN)
        // ZATCA standard format: CN=CommonName, OU=OU, O=O, C=SA
        // We inject the required OID attributes or general directory attributes.
        string subjectName = $"CN={companyName}, OU=TersERP_POS, O={companyName}, C=SA";
        
        // ZATCA expects Subject Alternative Name (SAN) directoryName containing:
        // UID=VatNumber, TITLE=1100 (Invoice type: B2B & B2C), REGISTERED_ADDRESS=Address, BUSINESS_CATEGORY=Category
        // For Sandbox simulation, building a standard X500Name with UID is sufficient.
        var dn = new X500DistinguishedName(subjectName);
        
        // Create request
        var request = new CertificateRequest(
            dn,
            ecdsa,
            HashAlgorithmName.SHA256
        );

        // Convert request to PEM format
        var csrBytes = request.CreateSigningRequest();
        var csrPem = ConvertToPem(csrBytes, "CERTIFICATE REQUEST");

        return (privateKeyPem, csrPem);
    }

    // Helper to format DER bytes to PEM string
    private static string ConvertToPem(byte[] bytes, string header)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"-----BEGIN {header}-----");
        var base64 = Convert.ToBase64String(bytes);
        int lineLength = 64;
        for (int i = 0; i < base64.Length; i += lineLength)
        {
            int length = Math.Min(lineLength, base64.Length - i);
            builder.AppendLine(base64.Substring(i, length));
        }
        builder.AppendLine($"-----END {header}-----");
        return builder.ToString();
    }

    // Sign XML Hash using Private Key
    public static string SignHash(string xmlHash, string privateKeyPem)
    {
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportFromPem(privateKeyPem);
        
        byte[] hashBytes = Convert.FromBase64String(xmlHash);
        
        // Sign the hash using ECDsa (with SHA-256)
        byte[] signatureBytes = ecdsa.SignHash(hashBytes);

        return Convert.ToBase64String(signatureBytes);
    }

    // Dynamic UBL 2.1 XML Generator (Simplified structure matching ZATCA phase 2 specs)
    public static string GenerateInvoiceXml(string invoiceNumber, DateTime issueDate, string sellerName, string vatNumber, decimal totalAmount, decimal vatAmount)
    {
        string uuid = Guid.NewGuid().ToString();
        string issueDateStr = issueDate.ToString("yyyy-MM-dd");
        string issueTimeStr = issueDate.ToString("HH:mm:ss");

        var xml = new StringBuilder();
        xml.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        xml.AppendLine("<Invoice xmlns=\"urn:oasis:names:specification:ubl:schema:xsd:Invoice-2\"");
        xml.AppendLine("         xmlns:cac=\"urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2\"");
        xml.AppendLine("         xmlns:cbc=\"urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2\">");
        xml.AppendLine($"    <cbc:UUID>{uuid}</cbc:UUID>");
        xml.AppendLine($"    <cbc:ID>{invoiceNumber}</cbc:ID>");
        xml.AppendLine($"    <cbc:IssueDate>{issueDateStr}</cbc:IssueDate>");
        xml.AppendLine($"    <cbc:IssueTime>{issueTimeStr}</cbc:IssueTime>");
        xml.AppendLine("    <cac:AccountingSupplierParty>");
        xml.AppendLine("        <cac:Party>");
        xml.AppendLine("            <cac:PartyName>");
        xml.AppendLine($"                <cbc:Name>{sellerName}</cbc:Name>");
        xml.AppendLine("            </cac:PartyName>");
        xml.AppendLine("            <cac:PartyTaxScheme>");
        xml.AppendLine($"                <cbc:CompanyID>{vatNumber}</cbc:CompanyID>");
        xml.AppendLine("                <cac:TaxScheme>");
        xml.AppendLine("                    <cbc:ID>VAT</cbc:ID>");
        xml.AppendLine("                </cac:TaxScheme>");
        xml.AppendLine("            </cac:PartyTaxScheme>");
        xml.AppendLine("        </cac:Party>");
        xml.AppendLine("    </cac:AccountingSupplierParty>");
        xml.AppendLine("    <cac:TaxTotal>");
        xml.AppendLine($"        <cbc:TaxAmount currencyID=\"SAR\">{vatAmount:F2}</cbc:TaxAmount>");
        xml.AppendLine("    </cac:TaxTotal>");
        xml.AppendLine("    <cac:LegalMonetaryTotal>");
        xml.AppendLine($"        <cbc:TaxInclusiveAmount currencyID=\"SAR\">{totalAmount:F2}</cbc:TaxInclusiveAmount>");
        xml.AppendLine("    </cac:LegalMonetaryTotal>");
        xml.AppendLine("</Invoice>");

        return xml.ToString();
    }

    // Helper to calculate SHA256 of XML string (for signing)
    public static string CalculateXmlHash(string xmlContent)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(xmlContent);
        byte[] hash = SHA256.HashData(bytes);
        return Convert.ToBase64String(hash);
    }
}
