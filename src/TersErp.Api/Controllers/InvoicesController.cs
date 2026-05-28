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
public class InvoicesController : ControllerBase
{
    private readonly TersDbContext _context;

    public InvoicesController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/invoices
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Invoice>>> GetInvoices()
    {
        return await _context.Invoices
            .Include(i => i.Lines)
            .OrderByDescending(i => i.IssueDate)
            .ToListAsync();
    }

    // GET: api/invoices/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Invoice>> GetInvoice(Guid id)
    {
        var invoice = await _context.Invoices
            .Include(i => i.Lines)
            .SingleOrDefaultAsync(i => i.Id == id);

        if (invoice == null)
        {
            return NotFound();
        }

        return invoice;
    }

    // POST: api/invoices
    [HttpPost]
    public async Task<ActionResult<Invoice>> CreateInvoice(CreateInvoiceDto dto)
    {
        if (dto.Lines == null || !dto.Lines.Any())
        {
            return BadRequest("يجب إدخال بند واحد على الأقل في الفاتورة. / At least one invoice line item is required.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // 1. Calculate values
            decimal subTotal = dto.Lines.Sum(l => l.Quantity * l.UnitPrice);
            decimal vatAmount = Math.Round(subTotal * 0.15m, 2); // 15% VAT standard rate
            decimal totalAmount = subTotal + vatAmount;

            // Generate unique invoice number (e.g. INV-2026-0001)
            var year = DateTime.UtcNow.Year;
            var count = await _context.Invoices.CountAsync(i => i.IssueDate.Year == year);
            var invoiceNum = $"INV-{year}-{(count + 1):D4}";

            // 2. Create Invoice Entity
            var invoice = new Invoice
            {
                CustomerId = dto.CustomerId,
                CustomerName = dto.CustomerName,
                InvoiceNumber = invoiceNum,
                IssueDate = dto.IssueDate,
                DueDate = dto.DueDate,
                SubTotal = subTotal,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                IsPaid = dto.IsPaid,
                Notes = dto.Notes ?? string.Empty
            };

            _context.Invoices.Add(invoice);
            await _context.SaveChangesAsync(); // Generates Invoice ID

            // 3. Add Invoice Lines
            foreach (var lineDto in dto.Lines)
            {
                var line = new InvoiceLine
                {
                    InvoiceId = invoice.Id,
                    ItemDescription = lineDto.ItemDescription,
                    Quantity = lineDto.Quantity,
                    UnitPrice = lineDto.UnitPrice,
                    LineTotal = lineDto.Quantity * lineDto.UnitPrice
                };
                _context.InvoiceLines.Add(line);

                // Stock sync: Decrease stock if product matches description
                var product = await _context.Products
                    .SingleOrDefaultAsync(p => p.Name.ToLower() == lineDto.ItemDescription.ToLower() || p.Sku.ToLower() == lineDto.ItemDescription.ToLower());
                
                if (product != null)
                {
                    product.StockQuantity -= lineDto.Quantity;
                    _context.Entry(product).State = EntityState.Modified;
                }
            }
            await _context.SaveChangesAsync();

            // 4. Automated Double-Entry General Ledger Posting
            await PostInvoiceToGeneralLedgerAsync(invoice);

            await transaction.CommitAsync();

            // Reload invoice with lines to return
            var reloadedInvoice = await _context.Invoices
                .Include(i => i.Lines)
                .SingleAsync(i => i.Id == invoice.Id);

            return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, reloadedInvoice);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return StatusCode(500, $"حدث خطأ أثناء معالجة الفاتورة: {ex.Message}");
        }
    }

    private async Task PostInvoiceToGeneralLedgerAsync(Invoice invoice)
    {
        // A. Resolve Accounts
        // A1. Resolve Debit Account: Cash/Bank "110101" (if paid) OR Accounts Receivable "1102" (if credit sale)
        string debitAccountCode = invoice.IsPaid ? "110101" : "1102";
        var debitAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == debitAccountCode);

        if (debitAccount == null)
        {
            // Fallback: look for accounts based on type
            debitAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == AccountType.Assets && !a.IsGroup);
        }

        if (debitAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب أصول لمديونية الفاتورة. / Asset account for debiting could not be found.");
        }

        // A2. Resolve Credit Account: Sales Revenue "41"
        var revenueAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "41");

        if (revenueAccount == null)
        {
            revenueAccount = await _context.Accounts
                .FirstOrDefaultAsync(a => a.Type == AccountType.Revenue && !a.IsGroup);
        }

        if (revenueAccount == null)
        {
            throw new InvalidOperationException("لم يتم العثور على حساب المبيعات والإيرادات. / Sales revenue account could not be found.");
        }

        // A3. Resolve/Create Credit Account: VAT Payable "2103"
        var vatAccount = await _context.Accounts
            .SingleOrDefaultAsync(a => a.Code == "2103");

        if (vatAccount == null && invoice.VatAmount > 0)
        {
            // Try to find the parent liabilities node "21" (الالتزامات المتداولة)
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
            Description = $"فاتورة مبيعات تلقائية رقم {invoice.InvoiceNumber} - للعميل: {invoice.CustomerName}",
            IsPosted = true
        };

        _context.JournalEntries.Add(entry);
        await _context.SaveChangesAsync();

        // C. Create Entry Lines
        // C1. Debit Entry Line (Cash or Receivable)
        var debitLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = debitAccount.Id,
            Debit = invoice.TotalAmount,
            Credit = 0m,
            Description = $"قيد مديونية الفاتورة رقم {invoice.InvoiceNumber}"
        };
        _context.JournalEntryLines.Add(debitLine);

        // Update balance
        debitAccount.Balance += invoice.TotalAmount;
        _context.Entry(debitAccount).State = EntityState.Modified;

        // C2. Credit Entry Line (Sales Revenue)
        var revenueLine = new JournalEntryLine
        {
            JournalEntryId = entry.Id,
            AccountId = revenueAccount.Id,
            Debit = 0m,
            Credit = invoice.SubTotal,
            Description = $"قيد إيراد الفاتورة رقم {invoice.InvoiceNumber}"
        };
        _context.JournalEntryLines.Add(revenueLine);

        // Update balance
        revenueAccount.Balance += invoice.SubTotal;
        _context.Entry(revenueAccount).State = EntityState.Modified;

        // C3. Credit Entry Line (VAT Payable) if tax is charged
        if (invoice.VatAmount > 0 && vatAccount != null)
        {
            var vatLine = new JournalEntryLine
            {
                JournalEntryId = entry.Id,
                AccountId = vatAccount.Id,
                Debit = 0m,
                Credit = invoice.VatAmount,
                Description = $"قيد الضريبة المستحقة للفاتورة رقم {invoice.InvoiceNumber}"
            };
            _context.JournalEntryLines.Add(vatLine);

            // Update balance
            vatAccount.Balance += invoice.VatAmount;
            _context.Entry(vatAccount).State = EntityState.Modified;
        }

        await _context.SaveChangesAsync();
    }
}

public record CreateInvoiceDto(
    Guid CustomerId,
    string CustomerName,
    DateTime IssueDate,
    DateTime DueDate,
    bool IsPaid,
    string? Notes,
    List<CreateInvoiceLineDto> Lines
);

public record CreateInvoiceLineDto(
    string ItemDescription,
    decimal Quantity,
    decimal UnitPrice
);
