using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TersErp.Api.Models;

namespace TersErp.Api.Interfaces;

public interface IJournalService
{
    Task<IEnumerable<JournalEntryDto>> GetJournalEntriesAsync();
    Task<JournalEntryDto?> GetJournalEntryByIdAsync(Guid id);
    Task<JournalEntryDto> CreateJournalEntryAsync(CreateJournalEntryDto dto);
    Task<JournalEntryDto> PostJournalEntryAsync(Guid id);
}
