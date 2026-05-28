using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TersErp.Api.Data;
using TersErp.Api.Models;

namespace TersErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VendorsController : ControllerBase
{
    private readonly TersDbContext _context;

    public VendorsController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/vendors
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vendor>>> GetVendors()
    {
        return await _context.Vendors.ToListAsync();
    }

    // GET: api/vendors/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Vendor>> GetVendor(Guid id)
    {
        var vendor = await _context.Vendors.SingleOrDefaultAsync(v => v.Id == id);
        if (vendor == null)
        {
            return NotFound();
        }
        return vendor;
    }

    // POST: api/vendors
    [HttpPost]
    public async Task<ActionResult<Vendor>> CreateVendor(CreateVendorDto dto)
    {
        var vendor = new Vendor
        {
            Name = dto.Name,
            Email = dto.Email ?? string.Empty,
            Phone = dto.Phone ?? string.Empty
        };

        _context.Vendors.Add(vendor);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVendor), new { id = vendor.Id }, vendor);
    }

    // PUT: api/vendors/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateVendor(Guid id, UpdateVendorDto dto)
    {
        var vendor = await _context.Vendors.SingleOrDefaultAsync(v => v.Id == id);
        if (vendor == null)
        {
            return NotFound();
        }

        vendor.Name = dto.Name;
        vendor.Email = dto.Email ?? string.Empty;
        vendor.Phone = dto.Phone ?? string.Empty;

        _context.Entry(vendor).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/vendors/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteVendor(Guid id)
    {
        var vendor = await _context.Vendors.SingleOrDefaultAsync(v => v.Id == id);
        if (vendor == null)
        {
            return NotFound();
        }

        _context.Vendors.Remove(vendor);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateVendorDto(string Name, string? Email, string? Phone);
public record UpdateVendorDto(string Name, string? Email, string? Phone);
