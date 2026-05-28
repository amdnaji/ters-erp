import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  X, 
  Trash2
} from 'lucide-react';

interface VendorInvoicesProps {
  lang: 'ar' | 'en';
}

interface VendorDto {
  id: string;
  name: string;
}

interface VendorInvoiceLineDto {
  id: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface VendorInvoiceDto {
  id: string;
  vendorId: string;
  vendorName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  isPaid: boolean;
  notes: string;
  lines: VendorInvoiceLineDto[];
}

const translations = {
  ar: {
    title: 'فواتير المشتريات',
    subtitle: 'تسجيل فواتير الشراء والتوريد، تتبع ضريبة المدخلات، وتحديث قيم المخزون تلقائياً.',
    addBtn: 'تسجيل فاتورة شراء جديدة',
    invNum: 'رقم الفاتورة',
    vendor: 'المورد',
    issueDate: 'تاريخ الشراء',
    dueDate: 'تاريخ الاستحقاق',
    total: 'إجمالي المشتريات',
    status: 'الدفع',
    paid: 'مسددة فوراً',
    unpaid: 'آجل (ذمم دائنة)',
    noInvoices: 'لا يوجد فواتير مشتريات مسجلة بعد.',
    loading: 'جاري تحميل سجل المشتريات...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    successCreate: 'تم تسجيل فاتورة الشراء وتحديث المستودعات والقيود المالية بنجاح!',
    modalTitleAdd: 'تسجيل فاتورة مشتريات وتوريد جديدة',
    labelVendor: 'اختر المورد',
    labelDate: 'تاريخ الشراء',
    labelDueDate: 'تاريخ الاستحقاق',
    labelPayment: 'طريقة السداد',
    payCash: 'سداد نقدي (الصندوق/البنك)',
    payCredit: 'شراء بالآجل (ذمم دائنة للمورد)',
    labelNotes: 'ملاحظات وتفاصيل التوريد',
    itemsHeader: 'بنود وتوريدات الفاتورة',
    itemDesc: 'اسم المنتج / بند المصروف',
    qty: 'الكمية',
    price: 'سعر الوحدة للشراء',
    lineTotal: 'الإجمالي الفرعي',
    addItemBtn: 'إضافة سطر بند شراء جديد',
    summarySubTotal: 'المجموع الخاضع للضريبة:',
    summaryVat: 'ضريبة المدخلات (15%):',
    summaryTotal: 'الإجمالي النهائي للفاتورة:',
    btnCancel: 'إلغاء',
    btnIssue: 'تسجيل الفاتورة والترحيل المحاسبي',
    receiptTitle: 'تفاصيل فاتورة المشتريات المستلمة',
    receiptSeller: 'الجهة الموردة:',
    receiptBuyer: 'المشتري (منشأتنا):',
    receiptVatRate: 'الضريبة المستحقة (15%):'
  },
  en: {
    title: 'Vendor Invoices',
    subtitle: 'Record supplier invoices, track input VAT credits, and auto-increase stock quantity levels.',
    addBtn: 'Record Purchase Invoice',
    invNum: 'Purchase No.',
    vendor: 'Supplier',
    issueDate: 'Purchase Date',
    dueDate: 'Due Date',
    total: 'Grand Total',
    status: 'Status',
    paid: 'Paid',
    unpaid: 'Credit (A/P)',
    noInvoices: 'No purchase invoices recorded yet.',
    loading: 'Loading purchase invoices...',
    errorDefault: 'An unexpected error occurred.',
    successCreate: 'Purchase invoice recorded! Stock levels & GL posted automatically.',
    modalTitleAdd: 'Record New Supplier Purchase Invoice',
    labelVendor: 'Select Vendor',
    labelDate: 'Purchase Date',
    labelDueDate: 'Due Date',
    labelPayment: 'Payment Terms',
    payCash: 'Paid Cash / Bank',
    payCredit: 'On Credit (Accounts Payable)',
    labelNotes: 'Supply Notes / References',
    itemsHeader: 'Purchase Line Items',
    itemDesc: 'Product Name / Expense Item',
    qty: 'Qty',
    price: 'Unit Cost',
    lineTotal: 'Total',
    addItemBtn: 'Add Purchase Line',
    summarySubTotal: 'Subtotal (Taxable):',
    summaryVat: 'Input VAT (15%):',
    summaryTotal: 'Grand Total:',
    btnCancel: 'Cancel',
    btnIssue: 'Record & Post Purchase',
    receiptTitle: 'Supplier Tax Invoice Copy',
    receiptSeller: 'Seller / supplier:',
    receiptBuyer: 'Buyer / Our Organization:',
    receiptVatRate: 'Input VAT Rate (15%):'
  }
};

export const VendorInvoices: React.FC<VendorInvoicesProps> = ({ lang }) => {
  const t = translations[lang];

  // Data States
  const [invoices, setInvoices] = useState<VendorInvoiceDto[]>([]);
  const [vendors, setVendors] = useState<VendorDto[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0, 10));
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ itemDescription: string; quantity: number; unitPrice: number }[]>([
    { itemDescription: '', quantity: 1, unitPrice: 0 }
  ]);

  // Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoiceDto | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, vendorsRes] = await Promise.all([
        axios.get<VendorInvoiceDto[]>('/api/vendorinvoices'),
        axios.get<VendorDto[]>('/api/vendors')
      ]);
      setInvoices(invoicesRes.data);
      setVendors(vendorsRes.data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddLine = () => {
    setLines(prev => [...prev, { itemDescription: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    setLines(prev => prev.map((l, i) => {
      if (i === index) {
        return { ...l, [field]: value };
      }
      return l;
    }));
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  };

  const subTotal = calculateSubtotal();
  const vatAmount = Math.round(subTotal * 0.15 * 100) / 100;
  const totalAmount = subTotal + vatAmount;

  const handleOpenCreate = () => {
    setSelectedVendorId(vendors[0]?.id || '');
    setIssueDate(new Date().toISOString().substring(0, 10));
    setDueDate(new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0, 10));
    setIsPaid(true);
    setNotes('');
    setLines([{ itemDescription: '', quantity: 1, unitPrice: 0 }]);
    setIsAddOpen(true);
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) return;
    if (lines.some(l => !l.itemDescription.trim() || l.unitPrice <= 0)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const matchedVendor = vendors.find(v => v.id === selectedVendorId);

    const payload = {
      vendorId: selectedVendorId,
      vendorName: matchedVendor ? matchedVendor.name : 'Unknown Supplier',
      issueDate: new Date(issueDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      isPaid: isPaid,
      notes: notes,
      lines: lines.map(l => ({
        itemDescription: l.itemDescription,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice)
      }))
    };

    try {
      await axios.post('/api/vendorinvoices', payload);
      setSuccessMsg(t.successCreate);
      setIsAddOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] flex items-center justify-center p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex flex-col items-center gap-3 text-xs text-gray-500 dark:text-gray-400 font-bold animate-pulse">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-600 dark:text-purple-400" />
          <span>{t.loading}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 animate-scale-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl shadow-purple-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'المشتريات والتوريدات المحاسبية' : 'Purchasing & Cost Ledger'}
              </span>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {t.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenCreate}
              disabled={vendors.length === 0}
              className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addBtn}</span>
            </button>
            <button
              onClick={loadData}
              className="p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {successMsg && (
          <div className="flex gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs rounded-xl border border-emerald-100 dark:border-emerald-950/50 font-medium">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="flex gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-100 dark:border-rose-950/50 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoices List */}
        <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl">
          {invoices.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
              <p className="text-xs">{t.noInvoices}</p>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-right border-collapse text-xs sm:text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-3.5">{t.invNum}</th>
                    <th className="px-6 py-3.5">{t.vendor}</th>
                    <th className="px-6 py-3.5">{t.issueDate}</th>
                    <th className="px-6 py-3.5">{t.total}</th>
                    <th className="px-6 py-3.5 text-center">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                  {invoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      onClick={() => setSelectedInvoice(invoice)}
                      className="hover:bg-purple-50/10 dark:hover:bg-purple-950/5 transition-all cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 font-semibold">{invoice.vendorName}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(invoice.issueDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                      </td>
                      <td className="px-6 py-4 font-black text-gray-950 dark:text-white">
                        {invoice.totalAmount.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {invoice.isPaid ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                              {t.paid}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-md border border-amber-100 dark:border-amber-900/30">
                              {t.unpaid}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: Record Invoice */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-4xl w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4 flex-shrink-0">
                <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <span>{t.modalTitleAdd}</span>
                </h3>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleIssueInvoice} className="space-y-6 overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelVendor}
                    </label>
                    <select
                      required
                      value={selectedVendorId}
                      onChange={(e) => setSelectedVendorId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelDueDate}
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelPayment}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPaid(true)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          isPaid 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                            : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        {t.payCash}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPaid(false)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          !isPaid 
                            ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                            : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        {t.payCredit}
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelNotes}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. استلام وتوريد مواد خام ومستلزمات مكتبية..."
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800/60 pb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {t.itemsHeader}
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="py-1 px-3 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-bold text-[10px] rounded-lg border border-purple-100 dark:border-purple-900/30 cursor-pointer"
                    >
                      {t.addItemBtn}
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-6">
                          <input
                            type="text"
                            required
                            value={line.itemDescription}
                            onChange={(e) => handleLineChange(idx, 'itemDescription', e.target.value)}
                            placeholder={t.itemDesc}
                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            required
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                            placeholder={t.qty}
                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={line.unitPrice}
                            onChange={(e) => handleLineChange(idx, 'unitPrice', Number(e.target.value))}
                            placeholder={t.price}
                            className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                          />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="flex-1 text-xs font-black text-gray-700 dark:text-gray-300 pr-2">
                            {(line.quantity * line.unitPrice).toLocaleString()}
                          </div>
                          {lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800/80">
                  <div className="w-64 space-y-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold pr-2">
                    <div className="flex items-center justify-between">
                      <span>{t.summarySubTotal}</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {subTotal.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.summaryVat}</span>
                      <span className="font-bold text-gray-700 dark:text-gray-300">
                        {vatAmount.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm border-t border-dashed border-gray-200 dark:border-gray-700 pt-1.5">
                      <span className="font-black text-gray-900 dark:text-white">{t.summaryTotal}</span>
                      <span className="font-black text-purple-600 dark:text-purple-400">
                        {totalAmount.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.btnCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        <span>{t.btnIssue}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* DETAILS MODAL */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>

              <button 
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-6 pt-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-black uppercase text-gray-900 dark:text-white">
                    {t.receiptTitle}
                  </h2>
                  <p className="text-[10px] text-purple-500 font-extrabold uppercase tracking-wide">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>

                <div className="border-y border-gray-100 dark:border-gray-800/80 py-3 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.receiptSeller}</span>
                    <span className="font-bold">{selectedInvoice.vendorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.receiptBuyer}</span>
                    <span className="font-bold">{lang === 'ar' ? 'منشأتنا المحاسبية' : 'Our Enterprise'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.issueDate}</span>
                    <span className="font-bold">
                      {new Date(selectedInvoice.issueDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {t.itemsHeader}
                  </h4>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/30">
                    {selectedInvoice.lines?.map((line, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{line.itemDescription}</p>
                          <p className="text-[10px] text-gray-400">
                            {line.quantity} × {line.unitPrice.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                          </p>
                        </div>
                        <span className="font-black">
                          {line.lineTotal.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800/80 pt-3 space-y-1.5 font-semibold text-right flex flex-col items-end">
                  <div className="w-56 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.summarySubTotal}</span>
                      <span className="font-bold">{selectedInvoice.subTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.receiptVatRate}</span>
                      <span className="font-bold">{selectedInvoice.vatAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-dashed border-gray-200 dark:border-gray-700 pt-1.5">
                      <span className="font-black text-gray-900 dark:text-white">{t.summaryTotal}</span>
                      <span className="font-black text-purple-600 dark:text-purple-400">
                        {selectedInvoice.totalAmount.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
