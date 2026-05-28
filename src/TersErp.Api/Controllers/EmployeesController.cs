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
public class EmployeesController : ControllerBase
{
    private readonly TersDbContext _context;

    public EmployeesController(TersDbContext context)
    {
        _context = context;
    }

    // GET: api/employees
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees()
    {
        return await _context.Employees.ToListAsync();
    }

    // GET: api/employees/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Employee>> GetEmployee(Guid id)
    {
        var employee = await _context.Employees.SingleOrDefaultAsync(e => e.Id == id);
        if (employee == null)
        {
            return NotFound();
        }
        return employee;
    }

    // POST: api/employees
    [HttpPost]
    public async Task<ActionResult<Employee>> CreateEmployee(CreateEmployeeDto dto)
    {
        var employee = new Employee
        {
            Name = dto.Name,
            JobTitle = dto.JobTitle ?? string.Empty,
            Department = dto.Department ?? string.Empty,
            BasicSalary = dto.BasicSalary,
            Allowances = dto.Allowances,
            HireDate = dto.HireDate ?? DateTime.UtcNow
        };

        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id }, employee);
    }

    // PUT: api/employees/{id}
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateEmployee(Guid id, UpdateEmployeeDto dto)
    {
        var employee = await _context.Employees.SingleOrDefaultAsync(e => e.Id == id);
        if (employee == null)
        {
            return NotFound();
        }

        employee.Name = dto.Name;
        employee.JobTitle = dto.JobTitle ?? string.Empty;
        employee.Department = dto.Department ?? string.Empty;
        employee.BasicSalary = dto.BasicSalary;
        employee.Allowances = dto.Allowances;
        if (dto.HireDate.HasValue)
        {
            employee.HireDate = dto.HireDate.Value;
        }

        _context.Entry(employee).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return NoContent();
    }

    // DELETE: api/employees/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteEmployee(Guid id)
    {
        var employee = await _context.Employees.SingleOrDefaultAsync(e => e.Id == id);
        if (employee == null)
        {
            return NotFound();
        }

        _context.Employees.Remove(employee);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateEmployeeDto(
    string Name,
    string? JobTitle,
    string? Department,
    decimal BasicSalary,
    decimal Allowances,
    DateTime? HireDate
);

public record UpdateEmployeeDto(
    string Name,
    string? JobTitle,
    string? Department,
    decimal BasicSalary,
    decimal Allowances,
    DateTime? HireDate
);
