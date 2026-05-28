using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using TersErp.Api.Data;
using TersErp.Api.Interfaces;
using TersErp.Api.Models;
using TersErp.Api.Services;

// 1. Force working directory to the application installation directory
// This is critical for SCM Windows Services which start in C:\Windows\System32\ by default!
System.IO.Directory.SetCurrentDirectory(AppContext.BaseDirectory);

var builder = WebApplication.CreateBuilder(args);

// Configure application to support running silently as a Windows Service
builder.Host.UseWindowsService();

// Load dynamic configurations from Shared Common Application Data (C:\ProgramData\TersERP)
// This is shared and accessible by both the LocalSystem Windows Service and standard interactive users.
var appDataFolder = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "TersERP");
if (!System.IO.Directory.Exists(appDataFolder))
{
    System.IO.Directory.CreateDirectory(appDataFolder);
}
var customConfigPath = System.IO.Path.Combine(appDataFolder, "appsettings.custom.json");
if (!System.IO.File.Exists(customConfigPath))
{
    System.IO.File.WriteAllText(customConfigPath, "{}");
}
builder.Configuration.AddJsonFile(customConfigPath, optional: true, reloadOnChange: true);

// Dynamic Port Selection
// Check if ASPNETCORE_URLS environment variable is set or if --urls argument is passed
bool urlsOverridden = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")) || 
                      Array.Exists(args, arg => arg.StartsWith("--urls", StringComparison.OrdinalIgnoreCase));

int port = 5080; // default safe port

if (!urlsOverridden)
{
    // Try to read port from appsettings.custom.json
    var configuredPortStr = builder.Configuration["Port"];
    if (int.TryParse(configuredPortStr, out int configPort) && configPort > 0)
    {
        if (IsPortAvailable(configPort))
        {
            port = configPort;
        }
        else
        {
            // If the configured port is explicitly set but in use, find any available port
            port = GetAvailablePort(5080);
        }
    }
    else
    {
        // Find first available port starting from 5080
        port = GetAvailablePort(5080);
    }
    
    // Bind to the resolved available port
    builder.WebHost.UseUrls($"http://localhost:{port}");
}
else
{
    // If overridden by command line or env, try to extract the port to write to active_port.txt
    var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS");
    if (string.IsNullOrEmpty(urls))
    {
        int urlsIdx = Array.FindIndex(args, arg => arg.Equals("--urls", StringComparison.OrdinalIgnoreCase));
        if (urlsIdx >= 0 && urlsIdx < args.Length - 1)
        {
            urls = args[urlsIdx + 1];
        }
    }
    
    if (!string.IsNullOrEmpty(urls))
    {
        try
        {
            var uri = new Uri(urls.Split(';')[0].Replace("*", "localhost").Replace("+", "localhost"));
            port = uri.Port;
        }
        catch { }
    }
}

// Write the active port to the shared AppData folder so shortcuts/launchers can read it dynamically
var activePortPath = System.IO.Path.Combine(appDataFolder, "active_port.txt");
System.IO.File.WriteAllText(activePortPath, port.ToString());

// 1. Configure Database Provider (PostgreSQL or SQLite) via Entity Framework Core with snake_case naming conventions
var dbProvider = builder.Configuration["DatabaseProvider"] ?? "SQLite"; // Default to SQLite for easy setup
if (dbProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
{
    var connectionString = builder.Configuration.GetConnectionString("SqliteConnection") ?? "Data Source=ters_erp_light.db";
    
    // Dynamically rewrite relative paths to reside in write-permitted User AppData
    if (connectionString.Contains("Data Source=") && !connectionString.Contains(":\\") && !connectionString.Contains("/") && !connectionString.Contains("\\"))
    {
        var dbName = connectionString.Replace("Data Source=", "").Trim();
        var fullDbPath = System.IO.Path.Combine(appDataFolder, dbName);
        connectionString = $"Data Source={fullDbPath}";
    }

    builder.Services.AddDbContext<TersDbContext>(options =>
        options.UseSqlite(connectionString)
               .UseSnakeCaseNamingConvention());
}
else
{
    builder.Services.AddDbContext<TersDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
               .UseSnakeCaseNamingConvention());
}

// 2. Register HttpContextAccessor and scoped ITenantService for multi-tenancy support
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IAccountService, AccountService>();
builder.Services.AddScoped<IJournalService, JournalService>();
builder.Services.AddScoped<ISecurityService, SecurityService>();
builder.Services.AddScoped<IReportService, ReportService>();

// 3. Register Data Protection services (required for cookie auth key encryption/decryption)
builder.Services.AddDataProtection();

// 4. Configure ASP.NET Core Identity Core with Guid keys and AddSignInManager()
builder.Services.AddIdentityCore<ApplicationUser>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    
    options.User.RequireUniqueEmail = true;
})
.AddRoles<ApplicationRole>()
.AddEntityFrameworkStores<TersDbContext>()
.AddSignInManager()
.AddDefaultTokenProviders();

// 5. Configure Cookie-based Authentication with SPA redirect overrides
builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddCookie(IdentityConstants.ApplicationScheme, options =>
    {
        options.Cookie.Name = "TersErp.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;

        // SameSite configuration based on environment
        if (builder.Environment.IsDevelopment())
        {
            options.Cookie.SameSite = SameSiteMode.Lax;
        }
        else
        {
            options.Cookie.SameSite = SameSiteMode.Strict;
        }

        // Return 401 Unauthorized for API requests instead of redirecting to login page
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };

        // Return 403 Forbidden for unauthorized requests instead of redirecting to access denied page
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

// 6. Enable CORS with "DevCorsPolicy" for Vite SPA on port 5173
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. Configure Web API Controllers with JSON cycle ignoring options
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

// 8. Configure Swagger Gen with Bearer Token/Cookie auth documentation support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Ters ERP API",
        Version = "v1",
        Description = "Foundational Web API for Ters ERP multi-tenant SaaS application"
    });

    options.AddSecurityDefinition("CookieAuth", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.ApiKey,
        In = ParameterLocation.Cookie,
        Name = "TersErp.Auth",
        Description = "Cookie-based authentication session cookie."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "CookieAuth"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Auto-initialize Database for SQLite trials only if the system has been configured
var setupPath = System.IO.Path.Combine(appDataFolder, "setup_complete.json");
if (System.IO.File.Exists(setupPath) && dbProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase))
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<TersDbContext>();
        context.Database.EnsureCreated();
    }
}

// 9. HTTP Pipeline Configuration
// Always enable Swagger for early stage exploration
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "Ters ERP API v1");
    options.RoutePrefix = "swagger";
});

// Enforce CORS policy in development
if (app.Environment.IsDevelopment())
{
    app.UseCors("DevCorsPolicy");
}

// Serve React SPA static files from the wwwroot folder.
// Under the new mono-repo architecture, the production React build output (from src/terserp.client/vite.config.ts)
// is compiled directly into this wwwroot directory (src/TersErp.Api/wwwroot/).
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

// Map controllers
app.MapControllers();

// Single-Port SPA Fallback Routing:
// Point to the index.html generated by the React Vite compiler in the wwwroot folder.
// This enables SPA routing (React Router) to handle any non-API requests seamlessly.
app.MapFallbackToFile("index.html");

app.Run();

// Helper functions for dynamic port selection
static bool IsPortAvailable(int port)
{
    try
    {
        using (var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, port))
        {
            listener.Start();
            return true;
        }
    }
    catch
    {
        return false;
    }
}

static int GetAvailablePort(int startingPort)
{
    int port = startingPort;
    // Scan up to 100 ports
    for (int i = 0; i < 100; i++)
    {
        if (IsPortAvailable(port))
        {
            return port;
        }
        port++;
    }
    throw new Exception("No available TCP port found in range 5080-5180.");
}