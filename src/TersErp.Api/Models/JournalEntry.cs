using System;
using System.Collections.Generic;

namespace TersErp.Api.Models;

public class JournalEntry : BaseEntity
{
    public string ReferenceNumber { get; set; } = string.Empty;
    public DateTime EntryDate { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsPosted { get; set; }

    public ICollection<JournalEntryLine> Lines { get; set; } = new List<JournalEntryLine>();
}
