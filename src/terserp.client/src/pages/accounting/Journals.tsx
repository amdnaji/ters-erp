import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Calendar, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Hash
} from 'lucide-react';

interface JournalsProps {
  lang: 'ar' | 'en';
  hasPermission: (scope: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
}

interface JournalEntryDto {
  id: string;
  referenceNumber: string;
  entryDate: string;
  description: string;
  isPosted: boolean;
  createdAt: string;
  lines: JournalEntryLineDto[];
}

interface JournalEntryLineDto {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
}

interface AccountNodeDto {
  id: string;
  code: string;
  name: string;
  isGroup: boolean;
}

interface UIJournalLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

const translations = {
  ar: {
    journalsTitle: 'القيود اليومية',
    journalsSubtitle: 'تسجيل وإثبات الحركات المالية في الدفاتر المحاسبية بنظام القيد المزدوج.',
    addJournalBtn: 'إنشاء قيد محاسبي جديد',
    refNum: 'رقم القيد',
    date: 'تاريخ القيد',
    description: 'شرح القيد (البيان العام)',
    status: 'حالة القيد',
    posted: 'مرحل ومقفل',
    draft: 'مسودة قيد',
    totalDebit: 'إجمالي المدين',
    totalCredit: 'إجمالي الدائن',
    createdDate: 'تاريخ الإنشاء',
    actions: 'الإجراءات',
    postBtn: 'ترحيل الآن',
    newJournalTitle: 'قيد محاسبي جديد - نظام القيد المزدوج',
    voucherDateLabel: 'تاريخ المعاملة المالية',
    generalMemoPlaceholder: 'اكتب هنا الشرح التفصيلي العام للقيد المحاسبي...',
    accountHeader: 'الحساب الفرعي',
    debitHeader: 'مدين',
    creditHeader: 'دائن',
    memoHeader: 'البيان',
    addLineBtn: 'إضافة سطر معاملة جديد',
    balancedAlert: 'القيد المحاسبي متوازن وصالح للترحيل الفوري.',
    unbalancedAlert: 'القيد المحاسبي غير متوازن! الفرق المالي:',
    zeroValueAlert: 'يجب أن تكون قيمة القيد المحاسبي أكبر من الصفر.',
    saveDraftBtn: 'حفظ كمسودة',
    savePostBtn: 'ترحيل وإقفال الدفاتر',
    backBtn: 'العودة للقائمة',
    selectAccountPlaceholder: 'اختر الحساب الفرعي المتأثر...',
    loading: 'جاري تحميل قيود اليومية...',
    noJournals: 'لا توجد قيود يومية مسجلة حالياً',
    noJournalsSubtitle: 'ابدأ بتسجيل قيدك الأول بالنقر على زر إنشاء قيد محاسبي جديد.',
    errorDefault: 'حدث خطأ غير متوقع أثناء إرسال البيانات.',
    postSuccess: 'تم ترحيل أرصدة القيد بنجاح.',
    saveSuccess: 'تم حفظ قيد اليومية بنجاح.',
  },
  en: {
    journalsTitle: 'Journal Entries',
    journalsSubtitle: 'Record and prove financial transactions using the double-entry accounting system.',
    addJournalBtn: 'Create New Journal Entry',
    refNum: 'Ref Number',
    date: 'Date',
    description: 'General Description',
    status: 'Status',
    posted: 'Posted & Locked',
    draft: 'Draft Voucher',
    totalDebit: 'Total Debit',
    totalCredit: 'Total Credit',
    createdDate: 'Created At',
    actions: 'Actions',
    postBtn: 'Post Now',
    newJournalTitle: 'New Double-Entry Journal Voucher',
    voucherDateLabel: 'Transaction Date',
    generalMemoPlaceholder: 'Write the general explanation of the journal voucher here...',
    accountHeader: 'Sub-Account Ledger',
    debitHeader: 'Debit',
    creditHeader: 'Credit',
    memoHeader: 'Memo',
    addLineBtn: 'Add Transaction Line',
    balancedAlert: 'Journal entry is balanced and ready for immediate posting.',
    unbalancedAlert: 'Journal entry is unbalanced! Difference:',
    zeroValueAlert: 'Voucher total value must be greater than zero.',
    saveDraftBtn: 'Save as Draft',
    savePostBtn: 'Post & Close Books',
    backBtn: 'Back to List',
    selectAccountPlaceholder: 'Select the affected sub-account...',
    loading: 'Loading journal entries...',
    noJournals: 'No journal entries registered yet',
    noJournalsSubtitle: 'Start by recording your first voucher by clicking the create button above.',
    errorDefault: 'An unexpected error occurred.',
    postSuccess: 'Journal balances successfully posted.',
    saveSuccess: 'Journal entry successfully saved.',
  }
};

export const Journals: React.FC<JournalsProps> = ({ lang, hasPermission }) => {
  const t = translations[lang];
  const [journals, setJournals] = useState<JournalEntryDto[]>([]);
  const [accounts, setAccounts] = useState<AccountNodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // View state: 'list' or 'create'
  const [view, setView] = useState<'list' | 'create'>('list');

  // Form State
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<UIJournalLine[]>([
    { accountId: '', debit: '', credit: '', description: '' },
    { accountId: '', debit: '', credit: '', description: '' }
  ]);

  // Load Journals and Accounts list
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [journalsRes, treeRes] = await Promise.all([
        axios.get<JournalEntryDto[]>('/api/journals'),
        axios.get<any[]>('/api/accounts/tree')
      ]);
      setJournals(journalsRes.data);

      // Flatten tree and filter out group accounts
      const flattened: AccountNodeDto[] = [];
      const extractLedgers = (nodes: any[]) => {
        if (!nodes) return;
        nodes.forEach(node => {
          if (!node.isGroup) {
            flattened.push({
              id: node.id,
              code: node.code,
              name: node.name,
              isGroup: node.isGroup
            });
          }
          if (node.children) {
            extractLedgers(node.children);
          }
        });
      };
      extractLedgers(treeRes.data);
      setAccounts(flattened);

      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || 'Error loading financial modules.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate Debit & Credit Sums
  const sumDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const sumCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const difference = Math.abs(sumDebits - sumCredits);
  const isBalanced = Math.abs(difference) < 0.0001 && sumDebits > 0;

  // Add line inside grid
  const handleAddLine = () => {
    setLines(prev => [...prev, { accountId: '', debit: '', credit: '', description: '' }]);
  };

  // Remove line inside grid
  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  // Update line details
  const handleLineChange = (idx: number, field: keyof UIJournalLine, val: string) => {
    setLines(prev => prev.map((line, i) => {
      if (i !== idx) return line;

      const updated = { ...line, [field]: val };

      // Automatic cross-zero check to prevent entering both debit and credit on same line
      if (field === 'debit' && val !== '') {
        updated.credit = '0';
      }
      if (field === 'credit' && val !== '') {
        updated.debit = '0';
      }

      return updated;
    }));
  };

  // Trigger post action from list
  const handlePostEntry = async (id: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await axios.post(`/api/journals/${id}/post`);
      setSuccessMsg(t.postSuccess);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  // Submit Voucher
  const handleSubmitVoucher = async (isPostTrigger: boolean) => {
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const postLines = lines.map(l => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
      description: l.description
    }));

    const payload = {
      entryDate,
      description,
      isPosted: isPostTrigger,
      lines: postLines
    };

    try {
      await axios.post('/api/journals', payload);
      setSuccessMsg(isPostTrigger ? t.postSuccess : t.saveSuccess);
      setDescription('');
      setLines([
        { accountId: '', debit: '', credit: '', description: '' },
        { accountId: '', debit: '', credit: '', description: '' }
      ]);
      setView('list');
      loadData();
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'SAR' }).format(val);
  };

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="max-w-5xl mx-auto space-y-6 animate-scale-in">
          
          {/* Header */}
          <div className="flex items-center justify-between bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setView('list')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
              >
                <ArrowRight className={`w-5 h-5 ${lang === 'ar' ? '' : 'rotate-180'}`} />
              </button>
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">{t.newJournalTitle}</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.journalsSubtitle}</p>
              </div>
            </div>
            <button 
              onClick={() => setView('list')}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              {t.backBtn}
            </button>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-2xl space-y-6">
            
            {error && (
              <div className="flex gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-100 dark:border-rose-950/50 mb-6 font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Entry Date */}
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  {t.voucherDateLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className={`absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400`} />
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className={`w-full ${lang === 'ar' ? 'pr-10 text-right' : 'pl-10 text-left'} py-2.5 text-sm bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium`}
                  />
                </div>
              </div>

              {/* General Memo */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  {t.description} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileText className={`absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400`} />
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.generalMemoPlaceholder}
                    className={`w-full ${lang === 'ar' ? 'pr-10 text-right' : 'pl-10 text-left'} py-2.5 text-sm bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium`}
                  />
                </div>
              </div>
            </div>

            {/* Entry Lines Grid */}
            <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 px-4 py-3 grid grid-cols-12 gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                <div className="col-span-12 sm:col-span-5">{t.accountHeader}</div>
                <div className="col-span-12 sm:col-span-2">{t.debitHeader}</div>
                <div className="col-span-12 sm:col-span-2">{t.creditHeader}</div>
                <div className="col-span-12 sm:col-span-2">{t.memoHeader}</div>
                <div className="hidden sm:block sm:col-span-1 text-center">{t.actions}</div>
              </div>

              <div className="p-4 space-y-4 divide-y divide-gray-50 dark:divide-gray-800/30">
                {lines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 pt-3 first:pt-0 items-center">
                    
                    {/* Account selection */}
                    <div className="col-span-12 sm:col-span-5">
                      <select
                        required
                        value={line.accountId}
                        onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all cursor-pointer font-medium"
                      >
                        <option value="">{t.selectAccountPlaceholder}</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.code} - {acc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Debit */}
                    <div className="col-span-6 sm:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.debit}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-3 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-left font-mono"
                        />
                      </div>
                    </div>

                    {/* Credit */}
                    <div className="col-span-6 sm:col-span-2">
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.credit}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-3 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-left font-mono"
                        />
                      </div>
                    </div>

                    {/* Memo */}
                    <div className="col-span-10 sm:col-span-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Memo..."
                        className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      />
                    </div>

                    {/* Action */}
                    <div className="col-span-2 sm:col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        disabled={lines.length <= 2}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg disabled:opacity-40 transition-all cursor-pointer"
                        title="Delete line"
                      >
                        <Trash2 className="w-4.5 h-4.5 mx-auto" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Add line button bar */}
              <div className="bg-gray-50/30 dark:bg-gray-900/10 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-start">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40 text-purple-700 dark:text-purple-400 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addLineBtn}</span>
                </button>
              </div>
            </div>

            {/* Summary Bar */}
            <div className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-4 transition-all shadow-sm ${
              isBalanced 
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900/40 dark:text-emerald-400 shadow-emerald-500/[0.02]' 
                : sumDebits > 0 
                  ? 'bg-rose-50/50 border-rose-200 text-rose-800 dark:bg-rose-950/10 dark:border-rose-900/40 dark:text-rose-400 shadow-rose-500/[0.02]' 
                  : 'bg-gray-50/50 border-gray-200 text-gray-600 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-400'
            }`}>
              
              <div className="flex items-center gap-2.5 font-semibold text-xs sm:text-sm">
                {isBalanced ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                    <span>{t.balancedAlert}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className={`w-5 h-5 ${sumDebits > 0 ? 'text-rose-500 dark:text-rose-400' : 'text-gray-400'}`} />
                    <span>
                      {sumDebits <= 0 ? t.zeroValueAlert : `${t.unbalancedAlert} ${formatCurrency(difference)}`}
                    </span>
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="flex items-center gap-6 font-mono text-xs sm:text-sm font-bold flex-shrink-0">
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[10px] text-gray-400 font-bold font-sans tracking-wide uppercase">{t.totalDebit}</span>
                  <span className="text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(sumDebits)}</span>
                </div>
                <div className="w-px h-8 bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>
                <div className="flex flex-col items-center sm:items-end">
                  <span className="text-[10px] text-gray-400 font-bold font-sans tracking-wide uppercase">{t.totalCredit}</span>
                  <span className="text-gray-800 dark:text-gray-200 mt-0.5">{formatCurrency(sumCredits)}</span>
                </div>
              </div>

            </div>

            {/* Actions / Submit buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/80">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitVoucher(false)}
                className="py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 disabled:opacity-40 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{t.saveDraftBtn}</span>
              </button>
              
              <button
                type="button"
                disabled={submitting || !isBalanced}
                onClick={() => handleSubmitVoucher(true)}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.savePostBtn}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // List view (Default)
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl shadow-purple-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                  {lang === 'ar' ? 'المحاسبة والقيود' : 'Accounting & Ledger'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {t.journalsTitle}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.journalsSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasPermission('JournalEntries', 'create') && (
              <button
                onClick={() => setView('create')}
                className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addJournalBtn}</span>
              </button>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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

        {/* Main List */}
        {loading ? (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              <div className="w-1/3 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="flex justify-between items-center py-4 border-b border-gray-100/50 dark:border-gray-800/50">
                <div className="w-1/2 space-y-2">
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-64 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                </div>
                <div className="w-24 h-5 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : journals.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-xl p-16 text-center text-gray-400 flex flex-col items-center justify-center">
            <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 animate-pulse mb-3" />
            <p className="text-sm font-semibold">{t.noJournals}</p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">{t.noJournalsSubtitle}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {journals.map(journal => {
              const linesDebitSum = journal.lines.reduce((sum, line) => sum + line.debit, 0);
              return (
                <div 
                  key={journal.id} 
                  className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-xl p-5 hover:border-purple-300/50 dark:hover:border-purple-900/30 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-50 dark:border-gray-800/60 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg font-bold border border-gray-200/40 dark:border-gray-700/40 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        <span>{journal.referenceNumber}</span>
                      </div>
                      <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(journal.entryDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Total Amount Badge */}
                      <div className="text-xs font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/30 px-3 py-1 border border-gray-200/30 dark:border-gray-800 rounded-lg">
                        {formatCurrency(linesDebitSum)}
                      </div>

                      {/* Status Badge */}
                      {journal.isPosted ? (
                        <span className="text-[10px] sm:text-xs font-bold py-1 px-3 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>{t.posted}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-xs font-bold py-1 px-3 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{t.draft}</span>
                        </span>
                      )}

                      {/* Post Button (only for drafts) */}
                      {!journal.isPosted && hasPermission('JournalEntries', 'update') && (
                        <button
                          onClick={() => handlePostEntry(journal.id)}
                          className="py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] sm:text-xs rounded-lg shadow-md shadow-purple-500/10 transition-all cursor-pointer"
                        >
                          {t.postBtn}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* General Description */}
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium mb-3 flex items-start gap-1.5">
                    <FileText className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <span>{journal.description}</span>
                  </p>

                  {/* Lines Display */}
                  <div className="bg-gray-50/50 dark:bg-[#121318]/50 border border-gray-100/50 dark:border-gray-800/50 rounded-xl overflow-hidden">
                    <div className="divide-y divide-gray-100 dark:divide-gray-800/30">
                      {journal.lines.map((line) => (
                        <div key={line.id} className="py-2.5 px-4 grid grid-cols-12 gap-2 text-[11px] items-center">
                          {/* Account code & name */}
                          <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                            <span className="font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-gray-500 rounded text-[9px] border border-gray-200/40 dark:border-gray-700/40">
                              {line.accountCode}
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 font-semibold truncate">
                              {line.accountName}
                            </span>
                          </div>

                          {/* Debit */}
                          <div className="col-span-4 sm:col-span-2 font-mono font-bold text-gray-700 dark:text-gray-300">
                            {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                          </div>

                          {/* Credit */}
                          <div className="col-span-4 sm:col-span-2 font-mono font-bold text-gray-700 dark:text-gray-300">
                            {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                          </div>

                          {/* Line Memo */}
                          <div className="col-span-4 sm:col-span-3 text-gray-400 truncate italic">
                            {line.description || ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
