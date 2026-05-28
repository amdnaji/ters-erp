using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TersErp.Api.Attributes;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;
    private readonly ITenantService _tenantService;

    public AccountsController(IAccountService accountService, ITenantService tenantService)
    {
        _accountService = accountService;
        _tenantService = tenantService;
    }

    // GET: api/accounts/tree
    [HttpGet("tree")]
    [HasPermission("ChartOfAccounts", "Read")]
    public async Task<ActionResult<IEnumerable<AccountNodeDto>>> GetAccountTree()
    {
        var tree = await _accountService.GetAccountTreeAsync();
        return Ok(tree);
    }

    // GET: api/accounts/{id}
    [HttpGet("{id}")]
    [HasPermission("ChartOfAccounts", "Read")]
    public async Task<ActionResult<AccountDto>> GetAccount(Guid id)
    {
        var account = await _accountService.GetAccountByIdAsync(id);
        if (account == null)
        {
            return NotFound();
        }
        return Ok(account);
    }

    // POST: api/accounts
    [HttpPost]
    [HasPermission("ChartOfAccounts", "Create")]
    public async Task<ActionResult<AccountDto>> CreateAccount(CreateAccountDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var account = await _accountService.CreateAccountAsync(dto);
            return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/accounts/seed
    // Optional administrative endpoint to trigger Chart of Accounts seeding for the current tenant
    [HttpPost("seed")]
    [HasPermission("ChartOfAccounts", "Create")]
    public async Task<IActionResult> SeedAccounts()
    {
        var currentTenantId = _tenantService.GetCurrentTenantId();
        await _accountService.SeedChartOfAccountsAsync(currentTenantId);
        return Ok(new { message = "Chart of accounts seeded successfully." });
    }
}
