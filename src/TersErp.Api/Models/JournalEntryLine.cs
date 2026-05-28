using System;

namespace TersErp.Api.Models;

public class JournalEntryLine : BaseEntity
{
    public Guid JournalEntryId { get; set; }
    public Guid AccountId { get; set; }
    public decimal Debit { get; set; }
    public decimal Credit { get; set; }
    public string Description { get; set; } = string.Empty;

    public JournalEntry? JournalEntry { get; set; }
    public Account? Account { get; set; }
}
