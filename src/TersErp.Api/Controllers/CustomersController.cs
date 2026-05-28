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
public class CustomersController : ControllerBase
{
    private readonly TersDbContext _context;

    public CustomersController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/customers
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
    {
        // Global query filter automatically filters by the current TenantId
        return await _context.Customers.ToListAsync();
    }

    // GET: api/customers/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Customer>> GetCustomer(Guid id)
    {
        // FindAsync will search local cache, but if it queries the DB, EF Core automatically applies the tenant filter
        var customer = await _context.Customers.SingleOrDefaultAsync(c => c.Id == id);

        if (customer == null)
        {
            return NotFound();
        }

        return customer;
    }

    // POST: api/customers
    [HttpPost]
    public async Task<ActionResult<Customer>> CreateCustomer(CreateCustomerDto dto)
    {
        var customer = new Customer
        {
            Name = dto.Name,
            Email = dto.Email,
            Phone = dto.Phone
            // BaseEntity automatically initializes Id with Guid.CreateVersion7()
            // TenantId and CreatedAt are automatically populated in TersDbContext.SaveChangesAsync()
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, customer);
    }

    // PUT: api/customers/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, UpdateCustomerDto dto)
    {
        var customer = await _context.Customers.SingleOrDefaultAsync(c => c.Id == id);
        if (customer == null)
        {
            return NotFound();
        }

        customer.Name = dto.Name;
        customer.Email = dto.Email;
        customer.Phone = dto.Phone;
        // UpdatedAt is automatically set in TersDbContext.SaveChangesAsync()

        _context.Entry(customer).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            if (!await CustomerExistsAsync(id))
            {
                return NotFound();
            }
            else
            {
                throw;
            }
        }

        return NoContent();
    }

    // DELETE: api/customers/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCustomer(Guid id)
    {
        var customer = await _context.Customers.SingleOrDefaultAsync(c => c.Id == id);
        if (customer == null)
        {
            return NotFound();
        }

        _context.Customers.Remove(customer);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private async Task<bool> CustomerExistsAsync(Guid id)
    {
        return await _context.Customers.AnyAsync(e => e.Id == id);
    }
}

public record CreateCustomerDto(string Name, string Email, string Phone);
public record UpdateCustomerDto(string Name, string Email, string Phone);
