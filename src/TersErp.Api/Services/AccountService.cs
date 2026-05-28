using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Services;

public class AccountService : IAccountService
{
    private readonly TersDbContext _context;
    private readonly ITenantService _tenantService;

    public AccountService(TersDbContext context, ITenantService tenantService)
    {
        _context = context;
        _tenantService = tenantService;
    }

    public async Task<AccountDto?> GetAccountByIdAsync(Guid id)
    {
        var account = await _context.Accounts.SingleOrDefaultAsync(a => a.Id == id);
        if (account == null)
        {
            return null;
        }

        return new AccountDto(
            account.Id,
            account.Code,
            account.Name,
            account.Type,
            account.ParentId,
            account.IsGroup,
            account.Balance,
            account.CreatedAt,
            account.UpdatedAt
        );
    }

    public async Task<IEnumerable<AccountNodeDto>> GetAccountTreeAsync()
    {
        // Query automatically applies global query filter by current TenantId.
        // Order by Code to make sure sibling accounts are sorted numerically/alphabetically.
        var allAccounts = await _context.Accounts
            .OrderBy(a => a.Code)
            .ToListAsync();

        // Map to tree DTOs
        var dtos = allAccounts.Select(a => new AccountNodeDto
        {
            Id = a.Id,
            Code = a.Code,
            Name = a.Name,
            Type = a.Type,
            ParentId = a.ParentId,
            IsGroup = a.IsGroup,
            Balance = a.Balance
        }).ToList();

        var dtoMap = dtos.ToDictionary(d => d.Id);
        var rootNodes = new List<AccountNodeDto>();

        foreach (var dto in dtos)
        {
            if (dto.ParentId == null)
            {
                rootNodes.Add(dto);
            }
            else if (dtoMap.TryGetValue(dto.ParentId.Value, out var parentNode))
            {
                parentNode.Children.Add(dto);
            }
            else
            {
                // In case the parent is not in this tenant's collection (orphan / boundary condition)
                rootNodes.Add(dto);
            }
        }

        return rootNodes;
    }

    public async Task<AccountDto> CreateAccountAsync(CreateAccountDto dto)
    {
        // 1. Validate unique code per tenant
        var codeExists = await _context.Accounts.AnyAsync(a => a.Code == dto.Code);
        if (codeExists)
        {
            throw new ArgumentException($"Account code '{dto.Code}' already exists for this tenant.");
        }

        // 2. Validate ParentId (if provided)
        if (dto.ParentId.HasValue)
        {
            var parent = await _context.Accounts.FindAsync(dto.ParentId.Value);
            if (parent == null)
            {
                throw new ArgumentException("Parent account does not exist.");
            }
            if (!parent.IsGroup)
            {
                throw new ArgumentException("Parent account must be a group account (IsGroup = true).");
            }
        }

        // 3. Create the Account Entity
        var newAccount = new Account
        {
            Code = dto.Code,
            Name = dto.Name,
            Type = dto.Type,
            ParentId = dto.ParentId,
            IsGroup = dto.IsGroup,
            Balance = 0m
        };

        _context.Accounts.Add(newAccount);
        await _context.SaveChangesAsync();

        // 4. Return the mapped DTO
        return new AccountDto(
            newAccount.Id,
            newAccount.Code,
            newAccount.Name,
            newAccount.Type,
            newAccount.ParentId,
            newAccount.IsGroup,
            newAccount.Balance,
            newAccount.CreatedAt,
            newAccount.UpdatedAt
        );
    }

    public async Task SeedChartOfAccountsAsync(Guid tenantId)
    {
        await ChartOfAccountsSeeder.SeedForTenantAsync(_context, tenantId);
    }
}
