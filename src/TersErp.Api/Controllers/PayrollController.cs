using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PayrollController : ControllerBase
{
    private readonly TersDbContext _context;

    public PayrollController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/payroll
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PayrollSlip>>> GetPayrollSlips()
    {
        return await _context.PayrollSlips
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .ToListAsync();
    }

    // POST: api/payroll/generate?month=5&year=2026
    [HttpPost("generate")]
    public async Task<ActionResult<IEnumerable<PayrollSlip>>> GeneratePayroll(int month, int year)
    {
        // Check if payroll is already generated for this month and year
        var exists = await _context.PayrollSlips.AnyAsync(p => p.Month == month && p.Year == year);
        if (exists)
        {
            return BadRequest($"مسير الرواتب لهذا الشهر {month}/{year} تم توليده بالفعل. / Payroll for {month}/{year} has already been generated.");
        }

        var employees = await _context.Employees.ToListAsync();
        var generatedSlips = new List<PayrollSlip>();

        foreach (var emp in employees)
        {
            var gross = emp.BasicSalary + emp.Allowances;
            var slip = new PayrollSlip
            {
                EmployeeId = emp.Id,
                EmployeeName = emp.Name,
                Month = month,
                Year = year,
                GrossSalary = gross,
                Deductions = 0m, // Starts clean
                NetSalary = gross,
                IsPaid = false
            };
            _context.PayrollSlips.Add(slip);
            generatedSlips.Add(slip);
        }

        await _context.SaveChangesAsync();
        return Ok(generatedSlips);
    }

    // POST: api/payroll/{id}/pay
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> PaySalary(Guid id)
    {
        var slip = await _context.PayrollSlips.SingleOrDefaultAsync(p => p.Id == id);
        if (slip == null)
        {
            return NotFound();
        }

        if (slip.IsPaid)
        {
            return BadRequest("هذا الراتب مصدّق ومصروف بالفعل. / This salary is already paid.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Mark as Paid
            slip.IsPaid = true;
            _context.Entry(slip).State = EntityState.Modified;

            // 2. Automated Ledger Posting
            await PostPayrollToGeneralLedgerAsync(slip);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(slip);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, $"حدث خطأ أثناء معالجة صرف الراتب: {ex.Message}");
        }
    }

    private async Task PostPayrollToGeneralLedgerAsync(PayrollSlip slip)
    {
        // A. Resolve Accounts
        // A1. Resolve Debit Account: Salaries and Wages Expense Code "5102"
        var expenseAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "5102");

        if (expenseAccount == null)
        {
            expenseAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == AccountType.Expenses && !a.IsGroup);
        }

        if (expenseAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب مصروف الرواتب. / Salaries expense account could not be found.");
        }

        // A2. Resolve Credit Account: Cash/Bank Code "110101"
        var cashAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "110101");

        if (cashAccount == null)
        {
            cashAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == AccountType.Assets && !a.IsGroup);
        }

        if (cashAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب الصندوق والصرف المالي. / Cash asset account could not be found.");
        }

        // B. Create Journal Entry
        var year = DateTime.UtcNow.Year;
        var count = await _context.JournalEntries.CountAsync(j => j.EntryDate.Year == year);
        var refNumber = $"JV-{year}-{(count + 1):D4}";

        var entry = new JournalEntry
        {
            ReferenceNumber = refNumber,
            EntryDate = DateTime.UtcNow,
            Description = $"صرف راتب شهر {slip.Month}/{slip.Year} - للموظف: {slip.EmployeeName}",
            IsPosted = true
        };

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        // C. Create Entry Lines
        // C1. Debit Entry Line (Salaries and Wages Expense)
        var debitLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = expenseAccount.Id,
            Debit = slip.NetSalary,
            Credit = 0m,
            Description = $"قيد استحقاق راتب {slip.EmployeeName} لشهر {slip.Month}/{slip.Year}"
        };
        _context.JournalEntryLines.Add(debitLine);

        // Update balance
        expenseAccount.Balance += slip.NetSalary;
        _context.Entry(expenseAccount).State = EntityState.Modified;

        // C2. Credit Entry Line (Cash/Bank Asset)
        var creditLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = cashAccount.Id,
            Debit = 0m,
            Credit = slip.NetSalary,
            Description = $"قيد صرف راتب {slip.EmployeeName} من الصندوق"
        };
        _context.JournalEntryLines.Add(creditLine);

        // Update balance
        cashAccount.Balance -= slip.NetSalary;
        _context.Entry(cashAccount).State = EntityState.Modified;

        await _context.SaveChangesAsync();
    }
}
