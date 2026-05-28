using Microsoft.AspNetCore.Mvc;
using System;

namespace TersErp.Api.Attributes;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public class HasPermissionAttribute : TypeFilterAttribute
{
    public HasPermissionAttribute(string scope, string action) : base(typeof(PermissionFilter))
    {
        Arguments = new object[] { scope, action };
    }
}
