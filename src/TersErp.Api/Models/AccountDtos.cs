using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TersErp.Api.Models;

public record CreateAccountDto(
    [Required] string Code,
    [Required] string Name,
    [Required] AccountType Type,
    Guid? ParentId,
    bool IsGroup
);

public record AccountDto(
    Guid Id,
    string Code,
    string Name,
    AccountType Type,
    Guid? ParentId,
    bool IsGroup,
    decimal Balance,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public class AccountNodeDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public AccountType Type { get; set; }
    public Guid? ParentId { get; set; }
    public bool IsGroup { get; set; }
    public decimal Balance { get; set; }
    public List<AccountNodeDto> Children { get; set; } = new();
}
