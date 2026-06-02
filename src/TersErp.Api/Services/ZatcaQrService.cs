using System;
using System.IO;
using System.Text;

namespace TersErp.Api.Services;

public class ZatcaQrService
{
    public static string GenerateZatcaQrCode(string sellerName, string vatNumber, DateTime issueDate, decimal totalAmount, decimal vatAmount)
    {
        sellerName ??= string.Empty;
        vatNumber ??= string.Empty;

        // 1. Prepare values in UTF-8
        byte[] sellerNameBytes = Encoding.UTF8.GetBytes(sellerName);
        byte[] vatNumberBytes = Encoding.UTF8.GetBytes(vatNumber);
        
        // ZATCA recommends ISO 8601 formatting (e.g. yyyy-MM-ddTHH:mm:ssZ or with offset)
        string dateStr = issueDate.ToString("yyyy-MM-ddTHH:mm:ss");
        if (issueDate.Kind == DateTimeKind.Utc)
        {
            dateStr += "Z";
        }
        else
        {
            // If local timezone has no offset info, fallback or add offset
            string offset = issueDate.ToString("zzz");
            // If zzz contains colons, format is fine
            dateStr += offset;
        }

        byte[] timeBytes = Encoding.UTF8.GetBytes(dateStr);
        byte[] totalBytes = Encoding.UTF8.GetBytes(totalAmount.ToString("0.00"));
        byte[] vatBytes = Encoding.UTF8.GetBytes(vatAmount.ToString("0.00"));

        using var ms = new MemoryStream();
        
        // Tag 1: Seller Name
        ms.WriteByte(1);
        ms.WriteByte((byte)sellerNameBytes.Length);
        ms.Write(sellerNameBytes, 0, sellerNameBytes.Length);

        // Tag 2: VAT Number
        ms.WriteByte(2);
        ms.WriteByte((byte)vatNumberBytes.Length);
        ms.Write(vatNumberBytes, 0, vatNumberBytes.Length);

        // Tag 3: Timestamp
        ms.WriteByte(3);
        ms.WriteByte((byte)timeBytes.Length);
        ms.Write(timeBytes, 0, timeBytes.Length);

        // Tag 4: Total Amount
        ms.WriteByte(4);
        ms.WriteByte((byte)totalBytes.Length);
        ms.Write(totalBytes, 0, totalBytes.Length);

        // Tag 5: VAT Amount
        ms.WriteByte(5);
        ms.WriteByte((byte)vatBytes.Length);
        ms.Write(vatBytes, 0, vatBytes.Length);

        return Convert.ToBase64String(ms.ToArray());
    }
}
