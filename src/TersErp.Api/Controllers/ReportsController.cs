using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TersErp.Api.Attributes;
using TersErp.Api.Interfaces;

namespace TersErp.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    // GET: api/reports/trial-balance
    [HttpGet("trial-balance")]
    [HasPermission("ChartOfAccounts", "Read")]
    public async Task<IActionResult> GetTrialBalance([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var data = await _reportService.GetTrialBalanceAsync(startDate, endDate);
        return Ok(data);
    }

    // GET: api/reports/income-statement
    [HttpGet("income-statement")]
    [HasPermission("ChartOfAccounts", "Read")]
    public async Task<IActionResult> GetIncomeStatement([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var data = await _reportService.GetIncomeStatementAsync(startDate, endDate);
        return Ok(data);
    }

    // GET: api/reports/balance-sheet
    [HttpGet("balance-sheet")]
    [HasPermission("ChartOfAccounts", "Read")]
    public async Task<IActionResult> GetBalanceSheet([FromQuery] DateTime? asOfDate)
    {
        var targetDate = asOfDate ?? DateTime.UtcNow;
        var data = await _reportService.GetBalanceSheetAsync(targetDate);
        return Ok(data);
    }
}
