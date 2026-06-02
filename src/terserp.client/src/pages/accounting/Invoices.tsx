import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  DollarSign, 
  Printer, 
  X, 
  Trash2,
  QrCode
} from 'lucide-react';
import QRCode from 'qrcode';

interface InvoicesProps {
  lang: 'ar' | 'en';
}

interface CustomerDto {
  id: string;
  name: string;
}

interface InvoiceLineDto {
  id: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface InvoiceDto {
  id: string;
  customerId: string;
  customerName: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subTotal: number;
  vatAmount: number;
  totalAmount: number;
  isPaid: boolean;
  notes: string;
  lines: InvoiceLineDto[];
  qrCode?: string;
}

const translations = {
  ar: {
    title: 'فواتير المبيعات',
    subtitle: 'إصدار فواتير مبيعات ذكية، احتساب الضريبة (15%)، والترحيل التلقائي لدفتر اليومية العامة.',
    addBtn: 'إنشاء فاتورة جديدة',
    invNum: 'رقم الفاتورة',
    customer: 'العميل',
    issueDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    total: 'الإجمالي مع الضريبة',
    status: 'الحالة',
    paid: 'مدفوعة (نقدي)',
    unpaid: 'آجل (ذمم مدينة)',
    noInvoices: 'لا يوجد فواتير صادرة بعد.',
    loading: 'جاري تحميل سجل الفواتير...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    successCreate: 'تم إصدار الفاتورة وتوليد القيد المحاسبي تلقائياً بنجاح!',
    modalTitleAdd: 'إنشاء فاتورة مبيعات جديدة',
    labelCustomer: 'اختر العميل',
    labelDate: 'تاريخ الفاتورة',
    labelDueDate: 'تاريخ الاستحقاق',
    labelPayment: 'طريقة السداد',
    payCash: 'سداد نقدي فوراً (الصندوق / البنك)',
    payCredit: 'بيع بالآجل (حساب العميل ذمم مدينة)',
    labelNotes: 'ملاحظات إضافية',
    itemsHeader: 'بنود وتفاصيل الفاتورة',
    itemDesc: 'وصف الخدمة / المنتج',
    qty: 'الكمية',
    price: 'سعر الوحدة',
    lineTotal: 'الإجمالي الفرعي',
    addItemBtn: 'إضافة سطر بند جديد',
    summarySubTotal: 'المجموع الخاضع للضريبة:',
    summaryVat: 'ضريبة القيمة المضافة (15%):',
    summaryTotal: 'الإجمالي النهائي المطلوب:',
    btnCancel: 'إلغاء',
    btnIssue: 'إصدار الفاتورة والترحيل الآن',
    receiptTitle: 'فاتورة ضريبية مبسطة',
    receiptSeller: 'المورد / المنشأة:',
    receiptBuyer: 'العميل المشتري:',
    receiptVatNum: 'الرقم الضريبي للمنشأة:',
    receiptVatRate: 'نسبة الضريبة:',
    printBtn: 'طباعة الفاتورة',
    qrText: 'الرمز المشفر المعتمد لهيئة الزكاة والضريبة والجمارك'
  },
  en: {
    title: 'Sales Invoices',
    subtitle: 'Issue smart tax invoices, auto-calculate 15% VAT, and post real-time journal entries to GL.',
    addBtn: 'Issue New Invoice',
    invNum: 'Invoice No.',
    customer: 'Client',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    total: 'Grand Total',
    status: 'Payment Status',
    paid: 'Paid (Cash)',
    unpaid: 'Credit (A/R)',
    noInvoices: 'No invoices issued yet.',
    loading: 'Loading invoice registry...',
    errorDefault: 'An unexpected error occurred.',
    successCreate: 'Invoice issued & double-entry GL voucher posted automatically!',
    modalTitleAdd: 'Create New Tax Invoice',
    labelCustomer: 'Select Customer',
    labelDate: 'Invoice Date',
    labelDueDate: 'Due Date',
    labelPayment: 'Payment Terms',
    payCash: 'Immediate Cash/Bank Payment',
    payCredit: 'On Credit (Accounts Receivable)',
    labelNotes: 'Additional Notes',
    itemsHeader: 'Invoice Line Items',
    itemDesc: 'Item Description / Service',
    qty: 'Qty',
    price: 'Unit Price',
    lineTotal: 'Total',
    addItemBtn: 'Add Invoice Line',
    summarySubTotal: 'Subtotal (Taxable):',
    summaryVat: 'VAT Amount (15%):',
    summaryTotal: 'Grand Total Due:',
    btnCancel: 'Cancel',
    btnIssue: 'Issue & Post Invoice',
    receiptTitle: 'Simplified Tax Invoice',
    receiptSeller: 'Seller / Organization:',
    receiptBuyer: 'Buyer / Customer:',
    receiptVatNum: 'VAT Registration Number:',
    receiptVatRate: 'Tax Rate:',
    printBtn: 'Print Invoice',
    qrText: 'ZATCA compliant cryptographic verification code'
  }
};

export const Invoices: React.FC<InvoicesProps> = ({ lang }) => {
  const t = translations[lang];
  
  // Data States
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Invoice Form States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0, 10));
  const [isPaid, setIsPaid] = useState(true);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<{ itemDescription: string; quantity: number; unitPrice: number }[]>([
    { itemDescription: '', quantity: 1, unitPrice: 0 }
  ]);

  // Invoice Details Modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDto | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (selectedInvoice && selectedInvoice.qrCode) {
      QRCode.toDataURL(selectedInvoice.qrCode)
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    } else {
      setQrDataUrl('');
    }
  }, [selectedInvoice]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invoicesRes, customersRes] = await Promise.all([
        axios.get<InvoiceDto[]>('/api/invoices'),
        axios.get<CustomerDto[]>('/api/customers')
      ]);
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
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

  // Real-time calculations
  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);
  };
  const subTotal = calculateSubtotal();
  const vatAmount = Math.round(subTotal * 0.15 * 100) / 100;
  const totalAmount = subTotal + vatAmount;

  const handleOpenCreate = () => {
    setSelectedCustomerId(customers[0]?.id || '');
    setIssueDate(new Date().toISOString().substring(0, 10));
    setDueDate(new Date(Date.now() + 30*24*60*60*1000).toISOString().substring(0, 10));
    setIsPaid(true);
    setNotes('');
    setLines([{ itemDescription: '', quantity: 1, unitPrice: 0 }]);
    setIsAddOpen(true);
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    if (lines.some(l => !l.itemDescription.trim() || l.unitPrice <= 0)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const matchedCustomer = customers.find(c => c.id === selectedCustomerId);

    const payload = {
      customerId: selectedCustomerId,
      customerName: matchedCustomer ? matchedCustomer.name : 'Unknown Customer',
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
      await axios.post('/api/invoices', payload);
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
                {lang === 'ar' ? 'المبيعات والفوترة الإلكترونية' : 'Smart Billing Ledger & VAT'}
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
              disabled={customers.length === 0}
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

        {/* Invoices List Panel */}
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
                    <th className="px-6 py-3.5">{t.customer}</th>
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
                      <td className="px-6 py-4 font-semibold">{invoice.customerName}</td>
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

        {/* FULL SCREEN MODAL: Create Invoice */}
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
                {/* Meta details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Select Customer */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                      {t.labelCustomer}
                    </label>
                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dates */}
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

                {/* Notes & Payment mode */}
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
                      placeholder="e.g. تقديم الاستشارات المحاسبية للفترة الأولى..."
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Line Items Matrix */}
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

                {/* Summary Matrix */}
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

                {/* Footer Buttons */}
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

        {/* MODAL: Invoice details (Simplified Tax Invoice Receipt Mockup) */}
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="absolute top-4 left-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Printable Invoice Container */}
              <div className="space-y-6 pt-4 text-xs sm:text-sm text-gray-800 dark:text-gray-200" id="printable-receipt">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-black uppercase text-gray-900 dark:text-white">
                    {t.receiptTitle}
                  </h2>
                  <p className="text-[10px] text-purple-500 font-extrabold uppercase tracking-wide">
                    {selectedInvoice.invoiceNumber}
                  </p>
                </div>

                {/* Meta details */}
                <div className="border-y border-gray-100 dark:border-gray-800/80 py-3 space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.receiptSeller}</span>
                    <span className="font-bold">{lang === 'ar' ? 'شركة ترس المحدودة' : 'Ters Ltd.'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.receiptBuyer}</span>
                    <span className="font-bold">{selectedInvoice.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.issueDate}</span>
                    <span className="font-bold">
                      {new Date(selectedInvoice.issueDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t.dueDate}</span>
                    <span className="font-bold">
                      {new Date(selectedInvoice.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </div>

                {/* Items */}
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

                {/* Summary */}
                <div className="border-t border-gray-100 dark:border-gray-800/80 pt-3 space-y-1.5 font-semibold text-right flex flex-col items-end">
                  <div className="w-56 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.summarySubTotal}</span>
                      <span className="font-bold">{selectedInvoice.subTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t.summaryVat}</span>
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

                {/* ZATCA Cryptographic QR Code */}
                {selectedInvoice.qrCode && (
                  <div className="flex flex-col items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-800/80 pt-4 print:pt-4">
                    <div className="p-3 bg-white border border-gray-150 rounded-xl shadow-sm">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} className="w-24 h-24" alt="ZATCA QR Code" />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                    <span className="text-[8px] text-gray-400 font-bold max-w-[200px] text-center leading-relaxed select-none">
                      {t.qrText}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/80 mt-4">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-800 dark:text-gray-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{t.printBtn}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
