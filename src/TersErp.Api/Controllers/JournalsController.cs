using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TersErp.Api.Attributes;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class JournalsController : ControllerBase
{
    private readonly IJournalService _journalService;

    public JournalsController(IJournalService journalService)
    {
        _journalService = journalService;
    }

    // GET: api/journals
    [HttpGet]
    [HasPermission("JournalEntries", "Read")]
    public async Task<ActionResult<IEnumerable<JournalEntryDto>>> GetJournalEntries()
    {
        var entries = await _journalService.GetJournalEntriesAsync();
        return Ok(entries);
    }

    // GET: api/journals/{id}
    [HttpGet("{id}")]
    [HasPermission("JournalEntries", "Read")]
    public async Task<ActionResult<JournalEntryDto>> GetJournalEntry(Guid id)
    {
        var entry = await _journalService.GetJournalEntryByIdAsync(id);
        if (entry == null)
        {
            return NotFound();
        }
        return Ok(entry);
    }

    // POST: api/journals
    [HttpPost]
    [HasPermission("JournalEntries", "Create")]
    public async Task<ActionResult<JournalEntryDto>> CreateJournalEntry(CreateJournalEntryDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var entry = await _journalService.CreateJournalEntryAsync(dto);
            return CreatedAtAction(nameof(GetJournalEntry), new { id = entry.Id }, entry);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST: api/journals/{id}/post
    [HttpPost("{id}/post")]
    [HasPermission("JournalEntries", "Update")]
    public async Task<ActionResult<JournalEntryDto>> PostJournalEntry(Guid id)
    {
        try
        {
            var entry = await _journalService.PostJournalEntryAsync(id);
            return Ok(entry);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
