using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace TersErp.Api.Models;

public record JournalEntryDto(
    Guid Id,
    string ReferenceNumber,
    DateTime EntryDate,
    string Description,
    bool IsPosted,
    DateTime CreatedAt,
    IEnumerable<JournalEntryLineDto> Lines
);

public record JournalEntryLineDto(
    Guid Id,
    Guid AccountId,
    string AccountCode,
    string AccountName,
    decimal Debit,
    decimal Credit,
    string Description
);

public record CreateJournalEntryDto(
    [Required(ErrorMessage = "تاريخ القيد مطلوب")]
    DateTime EntryDate,

    [Required(ErrorMessage = "شرح القيد مطلوب")]
    [StringLength(500, ErrorMessage = "يجب ألا يتجاوز الشرح 500 حرف")]
    string Description,

    bool IsPosted,

    [Required(ErrorMessage = "تفاصيل القيد مطلوبة")]
    [MinLength(2, ErrorMessage = "يجب أن يحتوي القيد على سطرين على الأقل لتطبيق القيد المزدوج")]
    IEnumerable<CreateJournalEntryLineDto> Lines
);

public record CreateJournalEntryLineDto(
    [Required(ErrorMessage = "الحساب مطلوب")]
    Guid AccountId,

    [Range(0, 999999999999, ErrorMessage = "يجب أن تكون القيمة موجبة")]
    decimal Debit,

    [Range(0, 999999999999, ErrorMessage = "يجب أن تكون القيمة موجبة")]
    decimal Credit,

    [StringLength(200, ErrorMessage = "يجب ألا يتجاوز شرح السطر 200 حرف")]
    string Description
);
