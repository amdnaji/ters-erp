using System;

namespace TersErp.Api.Interfaces;

public interface ITenantService
{
    Guid GetCurrentTenantId();
}
