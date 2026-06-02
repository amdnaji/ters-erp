using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TersErp.Api.Services;

public class ZatcaApiClient
{
    private static readonly HttpClient _httpClient = new();

    private const string SandboxUrl = "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal";
    private const string SimulationUrl = "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation";

    // Call ZATCA Compliance API to get CCSID
    public static async Task<(string Certificate, string Secret, string? Error)> RequestComplianceCertificate(string csrPem, string otp)
    {
        try
        {
            var payload = new
            {
                csr = Convert.ToBase64String(Encoding.UTF8.GetBytes(csrPem))
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"{SandboxUrl}/compliance")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            
            // Add ZATCA OTP Header
            request.Headers.Add("OTP", otp);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (string.Empty, string.Empty, $"ZATCA Compliance Error: {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;
            var cert = root.GetProperty("binarySecurityToken").GetString() ?? string.Empty;
            var secret = root.GetProperty("secret").GetString() ?? string.Empty;

            return (cert, secret, null);
        }
        catch (Exception ex)
        {
            return (string.Empty, string.Empty, $"Network exception: {ex.Message}");
        }
    }

    // Call ZATCA Production API to get PCSID
    public static async Task<(string Certificate, string Secret, string? Error)> RequestProductionCertificate(string complianceToken, string complianceSecret, string complianceRequestId)
    {
        try
        {
            var payload = new
            {
                compliance_request_id = complianceRequestId
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"{SandboxUrl}/production")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };

            // Set basic authentication using CCSID token and secret
            var authHeaderValue = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{complianceToken}:{complianceSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (string.Empty, string.Empty, $"ZATCA Production Certificate Request failed: {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;
            var cert = root.GetProperty("binarySecurityToken").GetString() ?? string.Empty;
            var secret = root.GetProperty("secret").GetString() ?? string.Empty;

            return (cert, secret, null);
        }
        catch (Exception ex)
        {
            return (string.Empty, string.Empty, $"Network exception: {ex.Message}");
        }
    }

    // Submit invoice for Reporting/Clearance (Phase 2 Simulation / Sandbox check)
    public static async Task<(bool Success, string? ClearanceStatus, string? InvoiceHash, string? Error)> SubmitInvoice(string xmlContent, string invoiceHash, string certToken, string certSecret, bool isB2B = false)
    {
        try
        {
            var payload = new
            {
                invoiceHash = invoiceHash,
                uuid = Guid.NewGuid().ToString(),
                invoice = Convert.ToBase64String(Encoding.UTF8.GetBytes(xmlContent))
            };

            string endpoint = isB2B ? "invoices/clearance" : "invoices/reporting";
            var request = new HttpRequestMessage(HttpMethod.Post, $"{SimulationUrl}/{endpoint}")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };

            var authHeaderValue = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{certToken}:{certSecret}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeaderValue);

            var response = await _httpClient.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, null, null, $"ZATCA Submission failed: {content}");
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;
            
            string status = root.TryGetProperty("clearanceStatus", out var statusProp) ? statusProp.GetString() ?? "REPORTED" : "REPORTED";
            
            return (true, status, invoiceHash, null);
        }
        catch (Exception ex)
        {
            return (false, null, null, $"Network exception: {ex.Message}");
        }
    }
}
