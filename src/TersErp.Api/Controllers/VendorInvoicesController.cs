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
public class VendorInvoicesController : ControllerBase
{
    private readonly TersDbContext _context;

    public VendorInvoicesController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/vendorinvoices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VendorInvoice>>> GetVendorInvoices()
    {
        return await _context.VendorInvoices
            .Include(vi => vi.Lines)
            .OrderByDescending(vi => vi.IssueDate)
            .ToListAsync();
    }

    // GET: api/vendorinvoices/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<VendorInvoice>> GetVendorInvoice(Guid id)
    {
        var invoice = await _context.VendorInvoices
            .Include(vi => vi.Lines)
            .SingleOrDefaultAsync(vi => vi.Id == id);

        if (invoice == null)
        {
            return NotFound();
        }

        return invoice;
    }

    // POST: api/vendorinvoices
    [HttpPost]
    public async Task<ActionResult<VendorInvoice>> CreateVendorInvoice(CreateVendorInvoiceDto dto)
    {
        if (dto.Lines == null || !dto.Lines.Any())
        {
            return BadRequest("يجب إدخال بند واحد على الأقل في فاتورة المشتريات. / At least one invoice line item is required.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Calculate values
            decimal subTotal = dto.Lines.Sum(l => l.Quantity * l.UnitPrice);
            decimal vatAmount = Math.Round(subTotal * 0.15m, 2); // 15% VAT standard rate
            decimal totalAmount = subTotal + vatAmount;

            // Generate unique reference purchase invoice number (e.g. PUR-2026-0001)
            var year = DateTime.UtcNow.Year;
            var count = await _context.VendorInvoices.CountAsync(vi => vi.IssueDate.Year == year);
            var invoiceNum = $"PUR-{year}-{(count + 1):D4}";

            // 2. Create Vendor Invoice Entity
            var invoice = new VendorInvoice
            {
                VendorId = dto.VendorId,
                VendorName = dto.VendorName,
                InvoiceNumber = invoiceNum,
                IssueDate = dto.IssueDate,
                DueDate = dto.DueDate,
                SubTotal = subTotal,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                IsPaid = dto.IsPaid,
                Notes = dto.Notes ?? string.Empty
            };

            _context.VendorInvoices.Add(invoice);
            await _context.SaveChangesAsync();

            // 3. Add Lines and Sync Product stock
            foreach (var lineDto in dto.Lines)
            {
                var line = new VendorInvoiceLine
                {
                    VendorInvoiceId = invoice.Id,
                    ItemDescription = lineDto.ItemDescription,
                    Quantity = lineDto.Quantity,
                    UnitPrice = lineDto.UnitPrice,
                    LineTotal = lineDto.Quantity * lineDto.UnitPrice
                };
                _context.VendorInvoiceLines.Add(line);

                // Inventory stock sync: Increase stock if Product SKU or Name matches description
                var product = await _context.Products
                    .SingleOrDefaultAsync(p => p.Name.ToLower() == lineDto.ItemDescription.ToLower() || p.Sku.ToLower() == lineDto.ItemDescription.ToLower());
                
                if (product != null)
                {
                    product.StockQuantity += lineDto.Quantity;
                    _context.Entry(product).State = EntityState.Modified;
                }
            }
            await _context.SaveChangesAsync();

            // 4. Automated Double-Entry General Ledger Posting
            await PostPurchaseInvoiceToGeneralLedgerAsync(invoice);

            await transaction.CommitAsync();

            var reloadedInvoice = await _context.VendorInvoices
                .Include(vi => vi.Lines)
                .SingleAsync(vi => vi.Id == invoice.Id);

            return CreatedAtAction(nameof(GetVendorInvoice), new { id = invoice.Id }, reloadedInvoice);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, $"حدث خطأ أثناء معالجة فاتورة المشتريات: {ex.Message}");
        }
    }

    private async Task PostPurchaseInvoiceToGeneralLedgerAsync(VendorInvoice invoice)
    {
        // A. Resolve Accounts
        // A1. Resolve Debit Account: Purchases / Expense (Dynamic look up for Code "5101" - تكلفة البضاعة المباعة)
        var debitAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "5101");

        if (debitAccount == null)
        {
            debitAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == AccountType.Expenses && !a.IsGroup);
        }

        if (debitAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب مصاريف لتسجيل المشتريات. / Expense account for purchasing could not be found.");
        }

        // A2. Resolve Credit Account: Accounts Payable "2101" (if unpaid) OR Cash/Bank "110101" (if paid)
        string creditAccountCode = invoice.IsPaid ? "110101" : "2101";
        var creditAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == creditAccountCode);

        if (creditAccount == null)
        {
            creditAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == (invoice.IsPaid ? AccountType.Assets : AccountType.Liabilities) && !a.IsGroup);
        }

        if (creditAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب مالي دائن لسداد الفاتورة. / Credit account for purchase invoice could not be found.");
        }

        // A3. Resolve/Create Debit Account: VAT Input Account using dynamic code "2103"
        // Debiting a liability account reduces the net VAT liability owed to ZATCA, which is correct.
        var vatAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "2103");

        if (vatAccount == null && invoice.VatAmount > 0)
        {
            var parentLiabilities = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Code == "21" && a.IsGroup);

            vatAccount = new Account
            {
                TenantId = invoice.TenantId,
                Code = "2103",
                Name = "ضريبة القيمة المضافة المستحقة",
                Type = AccountType.Liabilities,
                ParentId = parentLiabilities?.Id,
                IsGroup = false,
                Balance = 0m
            };
            _context.Accounts.Add(vatAccount);
            await _context.SaveChangesAsync();
        }

        // B. Create Journal Entry
        var year = invoice.IssueDate.Year;
        var count = await _context.JournalEntries.CountAsync(j => j.EntryDate.Year == year);
        var refNumber = $"JV-{year}-{(count + 1):D4}";

        var entry = new JournalEntry
        {
            ReferenceNumber = refNumber,
            EntryDate = invoice.IssueDate,
            Description = $"فاتورة مشتريات تلقائية رقم {invoice.InvoiceNumber} - من المورد: {invoice.VendorName}",
            IsPosted = true
        };

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        // C. Create Entry Lines
        // C1. Debit Entry Line (Expenses / Cost of Goods Sold)
        var debitLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = debitAccount.Id,
            Debit = invoice.SubTotal,
            Credit = 0m,
            Description = $"قيد إثبات مشتريات الفاتورة رقم {invoice.InvoiceNumber}"
        };
        _context.JournalEntryLines.Add(debitLine);

        // Update balance
        debitAccount.Balance += invoice.SubTotal;
        _context.Entry(debitAccount).State = EntityState.Modified;

        // C2. Debit Entry Line (VAT Input - reduces net VAT Payable)
        if (invoice.VatAmount > 0 && vatAccount != null)
        {
            var vatLine = new JournalEntryLine
            {
                JournalEntryId = entry.Id,
                AccountId = vatAccount.Id,
                Debit = invoice.VatAmount,
                Credit = 0m,
                Description = $"قيد ضريبة المدخلات للفاتورة رقم {invoice.InvoiceNumber}"
            };
            _context.JournalEntryLines.Add(vatLine);

            // Update balance (debiting reduces liability)
            vatAccount.Balance -= invoice.VatAmount;
            _context.Entry(vatAccount).State = EntityState.Modified;
        }

        // C3. Credit Entry Line (Cash or Accounts Payable)
        var creditLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = creditAccount.Id,
            Debit = 0m,
            Credit = invoice.TotalAmount,
            Description = $"قيد سداد/مديونية الفاتورة رقم {invoice.InvoiceNumber}"
        };
        _context.JournalEntryLines.Add(creditLine);

        // Update balance
        if (creditAccount.Type == AccountType.Assets)
        {
            creditAccount.Balance -= invoice.TotalAmount; // Cash asset decreases on credit
        }
        else
        {
            creditAccount.Balance += invoice.TotalAmount; // Liability accounts payable increases on credit
        }
        _context.Entry(creditAccount).State = EntityState.Modified;

        await _context.SaveChangesAsync();
    }
}

public record CreateVendorInvoiceDto(
    Guid VendorId,
    string VendorName,
    DateTime IssueDate,
    DateTime DueDate,
    bool IsPaid,
    string? Notes,
    List<CreateVendorInvoiceLineDto> Lines
);

public record CreateVendorInvoiceLineDto(
    string ItemDescription,
    decimal Quantity,
    decimal UnitPrice
);
