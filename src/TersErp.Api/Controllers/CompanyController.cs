using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;
using TersErp.Api.Services;

namespace TersErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CompanyController : ControllerBase
{
    private readonly TersDbContext _context;
    private readonly ITenantService _tenantService;

    public CompanyController(TersDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    // GET: api/company
    [HttpGet]
    public async Task<IActionResult> GetCompanyDetails()
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var tenant = await _context.Tenants.SingleOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return NotFound(new { message = "لم يتم العثور على بيانات الشركة. / Company details not found." });
        }

        return Ok(new
        {
            tenant.Id,
            tenant.Name,
            tenant.TenantCode,
            tenant.VatNumber,
            tenant.EnableZatca,
            tenant.ZatcaEnvironment,
            HasCertificate = !string.IsNullOrEmpty(tenant.ZatcaCertificate)
        });
    }

    // PUT: api/company
    [HttpPut]
    public async Task<IActionResult> UpdateCompanyDetails(UpdateCompanyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "اسم الشركة مطلوب. / Company name is required." });
        }

        var tenantId = _tenantService.GetCurrentTenantId();
        var tenant = await _context.Tenants.SingleOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return NotFound(new { message = "لم يتم العثور على بيانات الشركة. / Company details not found." });
        }

        tenant.Name = dto.Name;
        tenant.VatNumber = dto.VatNumber;
        tenant.EnableZatca = dto.EnableZatca;
        if (!string.IsNullOrEmpty(dto.ZatcaEnvironment))
        {
            tenant.ZatcaEnvironment = dto.ZatcaEnvironment;
        }

        _context.Entry(tenant).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            tenant.Id,
            tenant.Name,
            tenant.TenantCode,
            tenant.VatNumber,
            tenant.EnableZatca,
            tenant.ZatcaEnvironment,
            HasCertificate = !string.IsNullOrEmpty(tenant.ZatcaCertificate)
        });
    }

    // POST: api/company/generate-csr
    [HttpPost("generate-csr")]
    public async Task<IActionResult> GenerateCsr(GenerateCsrDto dto)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var tenant = await _context.Tenants.SingleOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return NotFound(new { message = "لم يتم العثور على بيانات الشركة." });
        }

        if (string.IsNullOrEmpty(tenant.VatNumber))
        {
            return BadRequest(new { message = "يرجى تحديد الرقم الضريبي للمنشأة أولاً قبل توليد الـ CSR." });
        }

        var (privateKey, csr) = ZatcaIntegrationService.GenerateCsr(
            tenant.Name,
            tenant.VatNumber,
            dto.RegisteredAddress ?? "Riyadh, KSA",
            dto.BusinessCategory ?? "Retail"
        );

        tenant.ZatcaPrivateKey = privateKey;
        _context.Entry(tenant).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { csrPem = csr });
    }

    // POST: api/company/register-ccsid
    [HttpPost("register-ccsid")]
    public async Task<IActionResult> RegisterCcsid(RegisterCcsidDto dto)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var tenant = await _context.Tenants.SingleOrDefaultAsync(t => t.Id == tenantId);
        if (tenant == null)
        {
            return NotFound(new { message = "لم يتم العثور على بيانات الشركة." });
        }

        if (string.IsNullOrEmpty(tenant.ZatcaPrivateKey))
        {
            return BadRequest(new { message = "يرجى توليد طلب التوقيع (CSR) أولاً." });
        }

        var (cert, secret, error) = await ZatcaApiClient.RequestComplianceCertificate(dto.CsrPem, dto.Otp);
        if (error != null)
        {
            return BadRequest(new { message = error });
        }

        tenant.ZatcaCertificate = cert;
        tenant.ZatcaSecret = secret;
        tenant.ZatcaEnvironment = "Sandbox"; // Initial onboarding puts them in Sandbox/Simulation

        _context.Entry(tenant).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "تم تسجيل وتوثيق شهادة التشفير (CCSID) بنجاح!", environment = tenant.ZatcaEnvironment });
    }
}

public record UpdateCompanyDto(
    string Name,
    string? VatNumber,
    bool EnableZatca,
    string? ZatcaEnvironment
);

public record GenerateCsrDto(
    string? RegisteredAddress,
    string? BusinessCategory
);

public record RegisterCcsidDto(
    string CsrPem,
    string Otp
);
