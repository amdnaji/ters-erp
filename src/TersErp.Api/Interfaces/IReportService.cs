using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TersErp.Api.Models;

namespace TersErp.Api.Interfaces;

public interface IReportService
{
    Task<IEnumerable<TrialBalanceLineDto>> GetTrialBalanceAsync(DateTime? startDate, DateTime? endDate);
    Task<IncomeStatementDto> GetIncomeStatementAsync(DateTime? startDate, DateTime? endDate);
    Task<BalanceSheetDto> GetBalanceSheetAsync(DateTime asOfDate);
}

// ==========================================
// Financial Report DTO Structures
// ==========================================

public record TrialBalanceLineDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    bool IsGroup,
    Guid? ParentId,
    decimal OpeningBalance,
    decimal Debit,
    decimal Credit,
    decimal EndingBalance
);

public record ReportItemDto(
    Guid AccountId,
    string AccountCode,
    string AccountName,
    bool IsGroup,
    Guid? ParentId,
    decimal Amount
);

public record IncomeStatementDto(
    List<ReportItemDto> RevenueItems,
    decimal TotalRevenue,
    List<ReportItemDto> ExpenseItems,
    decimal TotalExpense,
    decimal NetIncome
);

public record BalanceSheetDto(
    List<ReportItemDto> AssetItems,
    decimal TotalAssets,
    List<ReportItemDto> LiabilityItems,
    decimal TotalLiabilities,
    List<ReportItemDto> EquityItems,
    decimal TotalEquity,
    decimal NetIncome,
    bool IsBalanced
);
