using System;
using System.Text.Json.Serialization;

namespace TersErp.Api.Models;

public class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }
    public string Scope { get; set; } = string.Empty; // e.g. "ChartOfAccounts", "JournalEntries", "Users", "CompanySettings"
    public bool CanCreate { get; set; }
    public bool CanRead { get; set; }
    public bool CanUpdate { get; set; }
    public bool CanDelete { get; set; }

    [JsonIgnore]
    public ApplicationRole? Role { get; set; }
}
