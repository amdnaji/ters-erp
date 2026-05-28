using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Services;

public class ReportService : IReportService
{
    private readonly TersDbContext _context;
    private readonly ITenantService _tenantService;

    public ReportService(TersDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    public async Task<IEnumerable<TrialBalanceLineDto>> GetTrialBalanceAsync(DateTime? startDate, DateTime? endDate)
    {
        var tenantId = _tenantService.GetCurrentTenantId();

        // 1. Load all accounts for the active tenant
        var allAccounts = await _context.Accounts
            .Where(a => a.TenantId == tenantId)
            .ToListAsync();

        // 2. Load all posted journal entry lines
        var query = _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.TenantId == tenantId && l.JournalEntry != null && l.JournalEntry.IsPosted);

        var allLines = await query.ToListAsync();

        var start = DateTime.SpecifyKind(startDate ?? new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc), DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(endDate ?? new DateTime(2099, 12, 31, 23, 59, 59, DateTimeKind.Utc), DateTimeKind.Utc);

        // Calculate balances for leaf accounts
        var leafData = new Dictionary<Guid, (decimal opening, decimal debit, decimal credit)>();
        var leafAccounts = allAccounts.Where(a => !a.IsGroup).ToList();

        foreach (var account in leafAccounts)
        {
            var accountLines = allLines.Where(l => l.AccountId == account.Id).ToList();

            // Opening is transactions before the start date
            var priorLines = accountLines.Where(l => l.JournalEntry!.EntryDate < start).ToList();
            var priorDebit = priorLines.Sum(l => l.Debit);
            var priorCredit = priorLines.Sum(l => l.Credit);
            var openingBalance = CalculateBalance(account.Type, priorDebit, priorCredit);

            // Debits/credits in the period
            var periodLines = accountLines.Where(l => l.JournalEntry!.EntryDate >= start && l.JournalEntry!.EntryDate <= end).ToList();
            var debit = periodLines.Sum(l => l.Debit);
            var credit = periodLines.Sum(l => l.Credit);

            leafData[account.Id] = (openingBalance, debit, credit);
        }

        // Generate lines for all accounts (including parent groups)
        var result = new List<TrialBalanceLineDto>();

        foreach (var account in allAccounts)
        {
            decimal opening, debit, credit, ending;

            if (!account.IsGroup)
            {
                var data = leafData[account.Id];
                opening = data.opening;
                debit = data.debit;
                credit = data.credit;
                ending = opening + CalculateBalanceDelta(account.Type, debit, credit);
            }
            else
            {
                // For group accounts, sum all nested child leaf accounts
                var descendants = GetDescendantLeafAccounts(account.Id, allAccounts);
                opening = descendants.Sum(d => leafData[d.Id].opening);
                debit = descendants.Sum(d => leafData[d.Id].debit);
                credit = descendants.Sum(d => leafData[d.Id].credit);
                ending = opening + CalculateBalanceDelta(account.Type, debit, credit);
            }

            result.Add(new TrialBalanceLineDto(
                account.Id,
                account.Code,
                account.Name,
                account.IsGroup,
                account.ParentId,
                opening,
                debit,
                credit,
                ending
            ));
        }

        return result.OrderBy(r => r.AccountCode);
    }

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime? startDate, DateTime? endDate)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var start = DateTime.SpecifyKind(startDate ?? new DateTime(1900, 1, 1, 0, 0, 0, DateTimeKind.Utc), DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(endDate ?? new DateTime(2099, 12, 31, 23, 59, 59, DateTimeKind.Utc), DateTimeKind.Utc);

        var allAccounts = await _context.Accounts
            .Where(a => a.TenantId == tenantId)
            .ToListAsync();

        var allLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.TenantId == tenantId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate >= start && l.JournalEntry.EntryDate <= end)
            .ToListAsync();

        var revenueItems = new List<ReportItemDto>();
        var expenseItems = new List<ReportItemDto>();

        foreach (var account in allAccounts)
        {
            if (account.Type != AccountType.Revenue && account.Type != AccountType.Expenses)
                continue;

            decimal amount;

            if (!account.IsGroup)
            {
                var lines = allLines.Where(l => l.AccountId == account.Id).ToList();
                var debit = lines.Sum(l => l.Debit);
                var credit = lines.Sum(l => l.Credit);
                amount = CalculateBalance(account.Type, debit, credit);
            }
            else
            {
                var descendants = GetDescendantLeafAccounts(account.Id, allAccounts);
                decimal debit = 0, credit = 0;
                foreach (var desc in descendants)
                {
                    var lines = allLines.Where(l => l.AccountId == desc.Id).ToList();
                    debit += lines.Sum(l => l.Debit);
                    credit += lines.Sum(l => l.Credit);
                }
                amount = CalculateBalance(account.Type, debit, credit);
            }

            // Only show items with transaction balances to keep statements clean, or keep groups
            if (amount != 0 || account.IsGroup)
            {
                var dto = new ReportItemDto(
                    account.Id,
                    account.Code,
                    account.Name,
                    account.IsGroup,
                    account.ParentId,
                    amount
                );

                if (account.Type == AccountType.Revenue)
                    revenueItems.Add(dto);
                else
                    expenseItems.Add(dto);
            }
        }

        // Calculate totals for root parent accounts of type Revenue/Expenses
        var totalRevenue = revenueItems.Where(i => i.ParentId == null).Sum(i => i.Amount);
        var totalExpense = expenseItems.Where(i => i.ParentId == null).Sum(i => i.Amount);

        // If no root totals found (e.g. flat chart), sum all leaf items
        if (totalRevenue == 0) totalRevenue = revenueItems.Where(i => !i.IsGroup).Sum(i => i.Amount);
        if (totalExpense == 0) totalExpense = expenseItems.Where(i => !i.IsGroup).Sum(i => i.Amount);

        var netIncome = totalRevenue - totalExpense;

        return new IncomeStatementDto(
            revenueItems.OrderBy(i => i.AccountCode).ToList(),
            totalRevenue,
            expenseItems.OrderBy(i => i.AccountCode).ToList(),
            totalExpense,
            netIncome
        );
    }

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime asOfDate)
    {
        var tenantId = _tenantService.GetCurrentTenantId();
        var targetAsOf = DateTime.SpecifyKind(asOfDate, DateTimeKind.Utc);

        var allAccounts = await _context.Accounts
            .Where(a => a.TenantId == tenantId)
            .ToListAsync();

        var allLines = await _context.JournalEntryLines
            .Include(l => l.JournalEntry)
            .Where(l => l.TenantId == tenantId && l.JournalEntry != null && l.JournalEntry.IsPosted && l.JournalEntry.EntryDate <= targetAsOf)
            .ToListAsync();

        var assetItems = new List<ReportItemDto>();
        var liabilityItems = new List<ReportItemDto>();
        var equityItems = new List<ReportItemDto>();

        foreach (var account in allAccounts)
        {
            if (account.Type != AccountType.Assets && account.Type != AccountType.Liabilities && account.Type != AccountType.Equity)
                continue;

            decimal amount;

            if (!account.IsGroup)
            {
                var lines = allLines.Where(l => l.AccountId == account.Id).ToList();
                var debit = lines.Sum(l => l.Debit);
                var credit = lines.Sum(l => l.Credit);
                amount = CalculateBalance(account.Type, debit, credit);
            }
            else
            {
                var descendants = GetDescendantLeafAccounts(account.Id, allAccounts);
                decimal debit = 0, credit = 0;
                foreach (var desc in descendants)
                {
                    var lines = allLines.Where(l => l.AccountId == desc.Id).ToList();
                    debit += lines.Sum(l => l.Debit);
                    credit += lines.Sum(l => l.Credit);
                }
                amount = CalculateBalance(account.Type, debit, credit);
            }

            if (amount != 0 || account.IsGroup)
            {
                var dto = new ReportItemDto(
                    account.Id,
                    account.Code,
                    account.Name,
                    account.IsGroup,
                    account.ParentId,
                    amount
                );

                if (account.Type == AccountType.Assets)
                    assetItems.Add(dto);
                else if (account.Type == AccountType.Liabilities)
                    liabilityItems.Add(dto);
                else
                    equityItems.Add(dto);
            }
        }

        // Calculate root totals
        var totalAssets = assetItems.Where(i => i.ParentId == null).Sum(i => i.Amount);
        var totalLiabilities = liabilityItems.Where(i => i.ParentId == null).Sum(i => i.Amount);
        var totalEquityWithoutNetIncome = equityItems.Where(i => i.ParentId == null).Sum(i => i.Amount);

        if (totalAssets == 0) totalAssets = assetItems.Where(i => !i.IsGroup).Sum(i => i.Amount);
        if (totalLiabilities == 0) totalLiabilities = liabilityItems.Where(i => !i.IsGroup).Sum(i => i.Amount);
        if (totalEquityWithoutNetIncome == 0) totalEquityWithoutNetIncome = equityItems.Where(i => !i.IsGroup).Sum(i => i.Amount);

        // Fetch Net Income dynamically for the current period (all-time up to targetAsOf)
        var incomeStatement = await GetIncomeStatementAsync(null, targetAsOf);
        var netIncome = incomeStatement.NetIncome;

        // Append Net Income to the Equity section representation
        var totalEquity = totalEquityWithoutNetIncome + netIncome;

        // Balance Sheet Equation validation
        var difference = Math.Abs(totalAssets - (totalLiabilities + totalEquity));
        var isBalanced = difference < 0.01m; // Allow tiny rounding difference

        return new BalanceSheetDto(
            assetItems.OrderBy(i => i.AccountCode).ToList(),
            totalAssets,
            liabilityItems.OrderBy(i => i.AccountCode).ToList(),
            totalLiabilities,
            equityItems.OrderBy(i => i.AccountCode).ToList(),
            totalEquity,
            netIncome,
            isBalanced
        );
    }

    // ==========================================
    // Accounting Balance Helpers
    // ==========================================

    private decimal CalculateBalance(AccountType type, decimal debit, decimal credit)
    {
        if (type == AccountType.Assets || type == AccountType.Expenses)
        {
            return debit - credit;
        }
        // Liabilities, Equity, Revenue are Credit-based
        return credit - debit;
    }

    private decimal CalculateBalanceDelta(AccountType type, decimal debit, decimal credit)
    {
        if (type == AccountType.Assets || type == AccountType.Expenses)
        {
            return debit - credit;
        }
        return credit - debit;
    }

    private List<Account> GetDescendantLeafAccounts(Guid accountId, List<Account> allAccounts)
    {
        var leafAccounts = new List<Account>();
        var children = allAccounts.Where(a => a.ParentId == accountId).ToList();

        foreach (var child in children)
        {
            if (!child.IsGroup)
            {
                leafAccounts.Add(child);
            }
            else
            {
                leafAccounts.AddRange(GetDescendantLeafAccounts(child.Id, allAccounts));
            }
        }

        return leafAccounts;
    }
}
