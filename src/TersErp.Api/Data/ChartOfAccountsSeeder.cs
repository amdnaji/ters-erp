using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Models;

namespace TersErp.Api.Data;

public static class ChartOfAccountsSeeder
{
    public static async Task SeedForTenantAsync(TersDbContext context, Guid tenantId)
    {
        // Check if the tenant already has any accounts to avoid duplicate seeding
        var exists = await context.Accounts
            .IgnoreQueryFilters()
            .AnyAsync(a => a.TenantId == tenantId);

        if (exists)
        {
            return; // Already seeded
        }

        var accounts = new List<Account>();

        // Generate GUIDs for all parent nodes to link children correctly in a single batch insert.

        // ==========================================
        // 1. ASSETS (الأصول)
        // ==========================================
        var assetsId = Guid.CreateVersion7();
        var currentAssetsId = Guid.CreateVersion7();
        var cashId = Guid.CreateVersion7();

        accounts.Add(new Account
        {
            Id = assetsId,
            TenantId = tenantId,
            Code = "1",
            Name = "الأصول",
            Type = AccountType.Assets,
            ParentId = null,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = currentAssetsId,
            TenantId = tenantId,
            Code = "11",
            Name = "الأصول المتداولة",
            Type = AccountType.Assets,
            ParentId = assetsId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = cashId,
            TenantId = tenantId,
            Code = "1101",
            Name = "النقد وما يعادله",
            Type = AccountType.Assets,
            ParentId = currentAssetsId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "110101",
            Name = "الصندوق",
            Type = AccountType.Assets,
            ParentId = cashId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "110102",
            Name = "البنوك",
            Type = AccountType.Assets,
            ParentId = cashId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "1102",
            Name = "ذمم مدينة",
            Type = AccountType.Assets,
            ParentId = currentAssetsId,
            IsGroup = false,
            Balance = 0m
        });

        var nonCurrentAssetsId = Guid.CreateVersion7();
        accounts.Add(new Account
        {
            Id = nonCurrentAssetsId,
            TenantId = tenantId,
            Code = "12",
            Name = "الأصول غير المتداولة",
            Type = AccountType.Assets,
            ParentId = assetsId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "1201",
            Name = "العقارات والآلات والمعدات",
            Type = AccountType.Assets,
            ParentId = nonCurrentAssetsId,
            IsGroup = false,
            Balance = 0m
        });

        // ==========================================
        // 2. LIABILITIES (الالتزامات)
        // ==========================================
        var liabilitiesId = Guid.CreateVersion7();
        var currentLiabilitiesId = Guid.CreateVersion7();

        accounts.Add(new Account
        {
            Id = liabilitiesId,
            TenantId = tenantId,
            Code = "2",
            Name = "الالتزامات",
            Type = AccountType.Liabilities,
            ParentId = null,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = currentLiabilitiesId,
            TenantId = tenantId,
            Code = "21",
            Name = "الالتزامات المتداولة",
            Type = AccountType.Liabilities,
            ParentId = liabilitiesId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "2101",
            Name = "ذمم دائنة",
            Type = AccountType.Liabilities,
            ParentId = currentLiabilitiesId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "2102",
            Name = "مصاريف مستحقة",
            Type = AccountType.Liabilities,
            ParentId = currentLiabilitiesId,
            IsGroup = false,
            Balance = 0m
        });

        var nonCurrentLiabilitiesId = Guid.CreateVersion7();
        accounts.Add(new Account
        {
            Id = nonCurrentLiabilitiesId,
            TenantId = tenantId,
            Code = "22",
            Name = "الالتزامات غير المتداولة",
            Type = AccountType.Liabilities,
            ParentId = liabilitiesId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "2201",
            Name = "قروض طويلة الأجل",
            Type = AccountType.Liabilities,
            ParentId = nonCurrentLiabilitiesId,
            IsGroup = false,
            Balance = 0m
        });

        // ==========================================
        // 3. EQUITY (حقوق الملكية)
        // ==========================================
        var equityId = Guid.CreateVersion7();

        accounts.Add(new Account
        {
            Id = equityId,
            TenantId = tenantId,
            Code = "3",
            Name = "حقوق الملكية",
            Type = AccountType.Equity,
            ParentId = null,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "31",
            Name = "رأس المال",
            Type = AccountType.Equity,
            ParentId = equityId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "32",
            Name = "الأرباح المبقاة",
            Type = AccountType.Equity,
            ParentId = equityId,
            IsGroup = false,
            Balance = 0m
        });

        // ==========================================
        // 4. REVENUE (الإيرادات)
        // ==========================================
        var revenueId = Guid.CreateVersion7();

        accounts.Add(new Account
        {
            Id = revenueId,
            TenantId = tenantId,
            Code = "4",
            Name = "الإيرادات",
            Type = AccountType.Revenue,
            ParentId = null,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "41",
            Name = "إيرادات المبيعات",
            Type = AccountType.Revenue,
            ParentId = revenueId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "42",
            Name = "إيرادات الخدمات",
            Type = AccountType.Revenue,
            ParentId = revenueId,
            IsGroup = false,
            Balance = 0m
        });

        // ==========================================
        // 5. EXPENSES (المصاريف)
        // ==========================================
        var expensesId = Guid.CreateVersion7();
        var operatingExpensesId = Guid.CreateVersion7();

        accounts.Add(new Account
        {
            Id = expensesId,
            TenantId = tenantId,
            Code = "5",
            Name = "المصاريف",
            Type = AccountType.Expenses,
            ParentId = null,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = operatingExpensesId,
            TenantId = tenantId,
            Code = "51",
            Name = "المصاريف التشغيلية",
            Type = AccountType.Expenses,
            ParentId = expensesId,
            IsGroup = true,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "5101",
            Name = "تكلفة البضاعة المباعة",
            Type = AccountType.Expenses,
            ParentId = operatingExpensesId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "5102",
            Name = "الرواتب والأجور",
            Type = AccountType.Expenses,
            ParentId = operatingExpensesId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "5103",
            Name = "مصروف الإيجار",
            Type = AccountType.Expenses,
            ParentId = operatingExpensesId,
            IsGroup = false,
            Balance = 0m
        });

        accounts.Add(new Account
        {
            Id = Guid.CreateVersion7(),
            TenantId = tenantId,
            Code = "5104",
            Name = "مصروف المرافق",
            Type = AccountType.Expenses,
            ParentId = operatingExpensesId,
            IsGroup = false,
            Balance = 0m
        });

        context.Accounts.AddRange(accounts);
        await context.SaveChangesAsync();
    }
}
