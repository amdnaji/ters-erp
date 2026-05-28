using System;
using System.Collections.Generic;

namespace TersErp.Api.Models;

public class Account : BaseEntity
{
    public required string Code { get; set; }
    
    public required string Name { get; set; }
    
    public AccountType Type { get; set; }
    
    public Guid? ParentId { get; set; }
    
    public bool IsGroup { get; set; }
    
    public decimal Balance { get; set; } = 0m;
    
    // Navigation properties
    public Account? Parent { get; set; }
    
    public ICollection<Account> Children { get; set; } = new List<Account>();
}
