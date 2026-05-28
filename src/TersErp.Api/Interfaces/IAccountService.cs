using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TersErp.Api.Models;

namespace TersErp.Api.Interfaces;

public interface IAccountService
{
    Task<IEnumerable<AccountNodeDto>> GetAccountTreeAsync();
    
    Task<AccountDto?> GetAccountByIdAsync(Guid id);
    
    Task<AccountDto> CreateAccountAsync(CreateAccountDto dto);
    
    Task SeedChartOfAccountsAsync(Guid tenantId);
}
