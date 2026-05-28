using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Services;

public class JournalService : IJournalService
{
    private readonly TersDbContext _context;
    private readonly ITenantService _tenantService;

    public JournalService(TersDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    public async Task<IEnumerable<JournalEntryDto>> GetJournalEntriesAsync()
    {
        var entries = await _context.JournalEntries
            .Include(j => j.Lines)
                .ThenInclude(l => l.Account)
            .OrderByDescending(j => j.EntryDate)
            .ThenByDescending(j => j.CreatedAt)
            .ToListAsync();

        return entries.Select(MapToDto);
    }

    public async Task<JournalEntryDto?> GetJournalEntryByIdAsync(Guid id)
    {
        var entry = await _context.JournalEntries
            .Include(j => j.Lines)
                .ThenInclude(l => l.Account)
            .SingleOrDefaultAsync(j => j.Id == id);

        if (entry == null) return null;

        return MapToDto(entry);
    }

    public async Task<JournalEntryDto> CreateJournalEntryAsync(CreateJournalEntryDto dto)
    {
        // 1. Double-Entry Validations
        var totalDebit = dto.Lines.Sum(l => l.Debit);
        var totalCredit = dto.Lines.Sum(l => l.Credit);

        if (Math.Abs(totalDebit - totalCredit) > 0.0001m)
        {
            throw new ArgumentException("مجموع الجانب المدين يجب أن يتساوى مع الجانب الدائن لتوازن القيد المحاسبي. / The sum of debits must equal the sum of credits to balance the entry.");
        }

        if (totalDebit <= 0)
        {
            throw new ArgumentException("يجب أن تكون قيمة القيد المحاسبي أكبر من الصفر. / The voucher value must be greater than zero.");
        }

        // 2. Validate Accounts
        var accountIds = dto.Lines.Select(l => l.AccountId).Distinct().ToList();
        var accounts = await _context.Accounts
            .Where(a => accountIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id);

        foreach (var id in accountIds)
        {
            if (!accounts.TryGetValue(id, out var account))
            {
                throw new ArgumentException("أحد الحسابات المحددة غير موجود بالنظام. / One of the selected accounts does not exist.");
            }

            if (account.IsGroup)
            {
                throw new ArgumentException($"الحساب '{account.Code} - {account.Name}' هو حساب رئيسي (مجموعة). لا يمكن تسجيل القيود على الحسابات الرئيسية مباشرة. / Account '{account.Code}' is a group account. Posting directly to group accounts is not allowed.");
            }
        }

        // 3. Generate Sequence Reference Number (e.g. JV-2026-0001)
        var year = dto.EntryDate.Year;
        var count = await _context.JournalEntries.CountAsync(j => j.EntryDate.Year == year);
        var refNumber = $"JV-{year}-{(count + 1):D4}";

        // 4. Create Entry
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var entry = new JournalEntry
            {
                ReferenceNumber = refNumber,
                EntryDate = dto.EntryDate,
                Description = dto.Description,
                IsPosted = false // We will set this dynamically below
            };

            _context.JournalEntries.Add(entry);
            await _context.SaveChangesAsync();

            foreach (var lineDto in dto.Lines)
            {
                var line = new JournalEntryLine
                {
                    JournalEntryId = entry.Id,
                    AccountId = lineDto.AccountId,
                    Debit = lineDto.Debit,
                    Credit = lineDto.Credit,
                    Description = lineDto.Description ?? string.Empty
                };
                _context.JournalEntryLines.Add(line);
            }
            await _context.SaveChangesAsync();

            // 5. Post Immediately if requested
            if (dto.IsPosted)
            {
                await PostInternalAsync(entry);
            }

            await transaction.CommitAsync();

            // Reload for DTO mapping with accounts loaded
            var reloadedEntry = await _context.JournalEntries
                .Include(j => j.Lines)
                    .ThenInclude(l => l.Account)
                .SingleAsync(j => j.Id == entry.Id);

            return MapToDto(reloadedEntry);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<JournalEntryDto> PostJournalEntryAsync(Guid id)
    {
        var entry = await _context.JournalEntries
            .Include(j => j.Lines)
            .SingleOrDefaultAsync(j => j.Id == id);

        if (entry == null)
        {
            throw new KeyNotFoundException("قيد اليومية غير موجود. / Journal entry not found.");
        }

        if (entry.IsPosted)
        {
            throw new InvalidOperationException("هذا القيد تم ترحيله بالفعل. / This journal entry is already posted.");
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            await PostInternalAsync(entry);
            await transaction.CommitAsync();

            var reloadedEntry = await _context.JournalEntries
                .Include(j => j.Lines)
                    .ThenInclude(l => l.Account)
                .SingleAsync(j => j.Id == entry.Id);

            return MapToDto(reloadedEntry);
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task PostInternalAsync(JournalEntry entry)
    {
        foreach (var line in entry.Lines)
        {
            var account = await _context.Accounts.FindAsync(line.AccountId);
            if (account == null)
            {
                throw new InvalidOperationException("أحد الحسابات الفرعية غير موجود بالنظام. / One of the sub-accounts does not exist.");
            }

            // Accounting balance rollup rules:
            // Type enum: Assets, Liabilities, Equity, Revenue, Expenses
            if (account.Type == AccountType.Assets || account.Type == AccountType.Expenses)
            {
                account.Balance += line.Debit - line.Credit;
            }
            else
            {
                account.Balance += line.Credit - line.Debit;
            }
        }

        entry.IsPosted = true;
        await _context.SaveChangesAsync();
    }

    private JournalEntryDto MapToDto(JournalEntry entry)
    {
        return new JournalEntryDto(
            entry.Id,
            entry.ReferenceNumber,
            entry.EntryDate,
            entry.Description,
            entry.IsPosted,
            entry.CreatedAt,
            entry.Lines.Select(l => new JournalEntryLineDto(
                l.Id,
                l.AccountId,
                l.Account?.Code ?? string.Empty,
                l.Account?.Name ?? string.Empty,
                l.Debit,
                l.Credit,
                l.Description
            ))
        );
    }
}
