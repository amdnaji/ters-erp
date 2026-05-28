import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart2, 
  Layers, 
  TrendingUp, 
  Calendar, 
  Search, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface FinancialReportsProps {
  lang: 'ar' | 'en';
}

interface TrialBalanceLine {
  accountId: string;
  accountCode: string;
  accountName: string;
  isGroup: boolean;
  parentId: string | null;
  openingBalance: number;
  debit: number;
  credit: number;
  endingBalance: number;
}

interface ReportItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  isGroup: boolean;
  parentId: string | null;
  amount: number;
}

interface IncomeStatementDto {
  revenueItems: ReportItem[];
  totalRevenue: number;
  expenseItems: ReportItem[];
  totalExpense: number;
  netIncome: number;
}

interface BalanceSheetDto {
  assetItems: ReportItem[];
  totalAssets: number;
  liabilityItems: ReportItem[];
  totalLiabilities: number;
  equityItems: ReportItem[];
  totalEquity: number;
  netIncome: number;
  isBalanced: boolean;
}

const translations = {
  ar: {
    title: 'التقارير والقوائم المالية',
    subtitle: 'استعراض ميزان المراجعة، قائمة الدخل، والميزانية العمومية بدقة متناهية وفقاً للقيود اليومية.',
    tabTrialBalance: 'ميزان المراجعة',
    tabIncomeStatement: 'قائمة الدخل',
    tabBalanceSheet: 'الميزانية العمومية',
    
    // Filters
    startDate: 'من تاريخ',
    endDate: 'إلى تاريخ',
    asOfDate: 'حتى تاريخ',
    searchPlaceholder: 'بحث برمز أو اسم الحساب...',
    loading: 'جاري تحميل البيانات المالية...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    
    // Headers
    accCode: 'رمز الحساب',
    accName: 'اسم الحساب',
    openingBal: 'الرصيد الافتتاحي',
    debit: 'مدين',
    credit: 'دائن',
    endingBal: 'رصيد الإغلاق',
    amount: 'المبلغ',
    
    // KPI Cards
    assetsKpi: 'إجمالي الأصول',
    liabilitiesKpi: 'إجمالي الالتزامات',
    equityKpi: 'إجمالي حقوق الملكية',
    revenueKpi: 'إجمالي الإيرادات',
    expenseKpi: 'إجمالي المصروفات',
    netProfitKpi: 'صافي الربح أو الخسارة',
    netLossKpi: 'صافي خسارة الفترة',
    balancedSheet: 'الميزانية متزنة',
    unbalancedSheet: 'الميزانية غير متزنة! يوجد فارق حسابي',
    difference: 'الفارق',
    
    // Structure Empty States
    noData: 'لا توجد عمليات محاسبية مسجلة في هذه الفترة.',
    revenueTitle: 'الإيرادات التشغيلية وغير التشغيلية',
    expenseTitle: 'المصروفات والمصاريف العمومية',
    netIncomeResult: 'صافي نتيجة النشاط للفترة',
    assetsTitle: 'الأصول (المتداولة وغير المتداولة)',
    liabilitiesTitle: 'الالتزامات (المتداولة وغير المتداولة)',
    equityTitle: 'حقوق الملكية والأرباح المحتجزة',
    totalRevenuesSum: 'مجموع الإيرادات',
    totalExpensesSum: 'مجموع المصروفات',
    totalAssetsSum: 'مجموع الأصول',
    totalLiabilitiesSum: 'مجموع الالتزامات',
    totalEquitySum: 'مجموع حقوق الملكية والنتيجة',
    liabilityAndEquitySum: 'مجموع الالتزامات وحقوق الملكية'
  },
  en: {
    title: 'Financial Statements & Reports',
    subtitle: 'Generate real-time Trial Balances, Income Statements, and Balance Sheets derived from ledger entries.',
    tabTrialBalance: 'Trial Balance',
    tabIncomeStatement: 'Income Statement',
    tabBalanceSheet: 'Balance Sheet',
    
    // Filters
    startDate: 'Start Date',
    endDate: 'End Date',
    asOfDate: 'As of Date',
    searchPlaceholder: 'Search by code or account name...',
    loading: 'Loading financial statements...',
    errorDefault: 'An unexpected error occurred.',
    
    // Headers
    accCode: 'Account Code',
    accName: 'Account Name',
    openingBal: 'Opening Balance',
    debit: 'Debit',
    credit: 'Credit',
    endingBal: 'Ending Balance',
    amount: 'Amount',
    
    // KPI Cards
    assetsKpi: 'Total Assets',
    liabilitiesKpi: 'Total Liabilities',
    equityKpi: 'Total Equity',
    revenueKpi: 'Total Revenue',
    expenseKpi: 'Total Expenses',
    netProfitKpi: 'Net Profit',
    netLossKpi: 'Net Loss',
    balancedSheet: 'Balance Sheet Balanced',
    unbalancedSheet: 'Balance Sheet Unbalanced! Difference found',
    difference: 'Difference',
    
    // Structure Empty States
    noData: 'No posted ledger transactions found in the specified period.',
    revenueTitle: 'Operating & Non-Operating Revenues',
    expenseTitle: 'Operating & General Expenses',
    netIncomeResult: 'Net Period Performance Result',
    assetsTitle: 'Assets (Current & Non-Current)',
    liabilitiesTitle: 'Liabilities (Current & Non-Current)',
    equityTitle: 'Owner\'s Equity & Retained Earnings',
    totalRevenuesSum: 'Total Revenues',
    totalExpensesSum: 'Total Expenses',
    totalAssetsSum: 'Total Assets',
    totalLiabilitiesSum: 'Total Liabilities',
    totalEquitySum: 'Total Equity & Earnings',
    liabilityAndEquitySum: 'Total Liabilities & Equity'
  }
};

export const FinancialReports: React.FC<FinancialReportsProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'trial' | 'income' | 'balance'>('trial');
  
  // Date Filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-01-01`; // Default to start of current year
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  
  // States for data
  const [trialData, setTrialData] = useState<TrialBalanceLine[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeStatementDto | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetDto | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatAmount = (num: number) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'trial') {
        const res = await axios.get<TrialBalanceLine[]>(
          `/api/reports/trial-balance?startDate=${startDate}&endDate=${endDate}`
        );
        setTrialData(res.data);
      } else if (activeTab === 'income') {
        const res = await axios.get<IncomeStatementDto>(
          `/api/reports/income-statement?startDate=${startDate}&endDate=${endDate}`
        );
        setIncomeData(res.data);
      } else if (activeTab === 'balance') {
        const res = await axios.get<BalanceSheetDto>(
          `/api/reports/balance-sheet?asOfDate=${endDate}`
        );
        setBalanceData(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, startDate, endDate]);

  // Helpers to check tree-based indentation padding
  const getIndentation = (code: string) => {
    const parts = code.split('.');
    return (parts.length - 1) * 16; // 16px per tree indent level
  };

  // Filtered trial balance
  const filteredTrial = trialData.filter(line => {
    const term = searchTerm.toLowerCase();
    const name = line.accountName;
    return line.accountCode.includes(term) || name.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 animate-scale-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl shadow-purple-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'قوائم الحسابات الختامية' : 'GAAP Closing Statements'}
              </span>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {t.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="flex gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-100 dark:border-rose-950/50 mb-6 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters Panel */}
        <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-4">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            
            {activeTab !== 'balance' && (
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-500" />
                  <span>{t.startDate}</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-bold"
                />
              </div>
            )}

            <div className="flex flex-col gap-1 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-500" />
                <span>{activeTab === 'balance' ? t.asOfDate : t.endDate}</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-bold"
              />
            </div>

          </div>

          {activeTab === 'trial' && (
            <div className="flex-1 w-full flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Search className="w-3 h-3 text-purple-500" />
                <span>{lang === 'ar' ? 'فرز وتصفية النتائج' : 'Filter Ledger Search'}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                />
                <Search className={`w-3.5 h-3.5 text-gray-400 absolute top-2.5 ${lang === 'ar' ? 'left-3' : 'right-3'}`} />
              </div>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 p-1 bg-white dark:bg-[#1a1b22] rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab('trial')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'trial'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{t.tabTrialBalance}</span>
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'income'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.tabIncomeStatement}</span>
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'balance'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.tabBalanceSheet}</span>
          </button>
        </div>

        {/* ========================================== */}
        {/* VIEW 1: TRIAL BALANCE */}
        {/* ========================================== */}
        {activeTab === 'trial' && (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-6">
            {filteredTrial.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs">{t.noData}</p>
              </div>
            ) : (
              <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                      <th className="px-4 py-3.5 w-[140px]">{t.accCode}</th>
                      <th className="px-4 py-3.5">{t.accName}</th>
                      <th className="px-4 py-3.5 text-center w-[130px]">{t.openingBal}</th>
                      <th className="px-4 py-3.5 text-center w-[110px]">{t.debit}</th>
                      <th className="px-4 py-3.5 text-center w-[110px]">{t.credit}</th>
                      <th className="px-4 py-3.5 text-center w-[130px]">{t.endingBal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                    {filteredTrial.map(line => {
                      const padding = getIndentation(line.accountCode);
                      return (
                        <tr 
                          key={line.accountId} 
                          className={`hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all ${
                            line.isGroup ? 'font-bold bg-gray-50/30 dark:bg-gray-900/10' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 font-mono font-bold text-[11px] text-gray-500 dark:text-gray-400">
                             {line.accountCode}
                          </td>
                          <td className="px-4 py-3.5" style={{ paddingRight: lang === 'ar' ? `${16 + padding}px` : '16px', paddingLeft: lang === 'en' ? `${16 + padding}px` : '16px' }}>
                            {line.accountName}
                          </td>
                          <td className={`px-4 py-3.5 text-center font-mono ${line.openingBalance < 0 ? 'text-rose-500' : ''}`}>
                            {formatAmount(line.openingBalance)}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-emerald-600 dark:text-emerald-400">
                            {line.debit > 0 ? formatAmount(line.debit) : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-center font-mono text-amber-600 dark:text-amber-400">
                            {line.credit > 0 ? formatAmount(line.credit) : '-'}
                          </td>
                          <td className={`px-4 py-3.5 text-center font-mono font-bold ${line.endingBalance < 0 ? 'text-rose-500' : 'text-purple-600 dark:text-purple-400'}`}>
                            {formatAmount(line.endingBalance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 2: INCOME STATEMENT */}
        {/* ========================================== */}
        {activeTab === 'income' && incomeData && (
          <div className="space-y-6 animate-scale-in">
            
            {/* Summary Net Income KPI Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.revenueKpi}</span>
                  <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {formatAmount(incomeData.totalRevenue)}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.expenseKpi}</span>
                  <h3 className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                    {formatAmount(incomeData.totalExpense)}
                  </h3>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
                  <BarChart2 className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {incomeData.netIncome >= 0 ? t.netProfitKpi : t.netLossKpi}
                  </span>
                  <h3 className={`text-xl font-black font-mono mt-1 ${
                    incomeData.netIncome >= 0 ? 'text-purple-600 dark:text-purple-400' : 'text-rose-500'
                  }`}>
                    {formatAmount(incomeData.netIncome)}
                  </h3>
                </div>
                <div className={`p-3 rounded-xl ${
                  incomeData.netIncome >= 0 
                    ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' 
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-50'
                }`}>
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Income Statement Detailed Panel */}
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-6">
              
              {/* REVENUE SECTION */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                  {t.revenueTitle}
                </h3>
                {incomeData.revenueItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">{t.noData}</p>
                ) : (
                  <div className="space-y-1">
                    {incomeData.revenueItems.map(item => {
                      const padding = getIndentation(item.accountCode);
                      return (
                        <div 
                          key={item.accountId} 
                          className={`flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg hover:bg-gray-50/30 dark:hover:bg-gray-800/10 ${
                            item.isGroup ? 'font-bold bg-gray-50/20 dark:bg-gray-900/10' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-gray-400 w-[80px]">{item.accountCode}</span>
                            <span style={{ paddingRight: lang === 'ar' ? `${padding}px` : '0px', paddingLeft: lang === 'en' ? `${padding}px` : '0px' }}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatAmount(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* Section Total Row */}
                    <div className="flex justify-between items-center py-3 px-3 text-xs sm:text-sm border-t-2 border-double border-gray-100 dark:border-gray-800 font-extrabold text-purple-600 dark:text-purple-400">
                      <span>{t.totalRevenuesSum}</span>
                      <span className="font-mono">{formatAmount(incomeData.totalRevenue)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* EXPENSE SECTION */}
              <div className="space-y-3 pt-4">
                <h3 className="text-xs font-black text-rose-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                  {t.expenseTitle}
                </h3>
                {incomeData.expenseItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">{t.noData}</p>
                ) : (
                  <div className="space-y-1">
                    {incomeData.expenseItems.map(item => {
                      const padding = getIndentation(item.accountCode);
                      return (
                        <div 
                          key={item.accountId} 
                          className={`flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg hover:bg-gray-50/30 dark:hover:bg-gray-800/10 ${
                            item.isGroup ? 'font-bold bg-gray-50/20 dark:bg-gray-900/10' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-gray-400 w-[80px]">{item.accountCode}</span>
                            <span style={{ paddingRight: lang === 'ar' ? `${padding}px` : '0px', paddingLeft: lang === 'en' ? `${padding}px` : '0px' }}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatAmount(item.amount)}
                          </span>
                        </div>
                      );
                    })}
                    
                    {/* Section Total Row */}
                    <div className="flex justify-between items-center py-3 px-3 text-xs sm:text-sm border-t-2 border-double border-gray-100 dark:border-gray-800 font-extrabold text-rose-500">
                      <span>{t.totalExpensesSum}</span>
                      <span className="font-mono">{formatAmount(incomeData.totalExpense)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* NET BOTTOM RESULT */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800/80">
                <div className={`flex justify-between items-center p-4 rounded-xl font-black text-sm sm:text-base ${
                  incomeData.netIncome >= 0
                    ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30'
                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-950/50'
                }`}>
                  <span>{t.netIncomeResult}</span>
                  <span className="font-mono">{formatAmount(incomeData.netIncome)}</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* VIEW 3: BALANCE SHEET */}
        {/* ========================================== */}
        {activeTab === 'balance' && balanceData && (
          <div className="space-y-6 animate-scale-in">
            
            {/* KPI Overview and Balance Verification status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              
              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.assetsKpi}</span>
                  <h3 className="text-base font-black text-purple-600 dark:text-purple-400 font-mono mt-1">
                    {formatAmount(balanceData.totalAssets)}
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.liabilitiesKpi}</span>
                  <h3 className="text-base font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                    {formatAmount(balanceData.totalLiabilities)}
                  </h3>
                </div>
              </div>

              <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.equityKpi}</span>
                  <h3 className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                    {formatAmount(balanceData.totalEquity)}
                  </h3>
                </div>
              </div>

              <div className={`p-4 rounded-2xl shadow-xl border flex items-center gap-3 ${
                balanceData.isBalanced 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-50/50 dark:bg-rose-950/15 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400'
              }`}>
                {balanceData.isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                )}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block">
                    {balanceData.isBalanced ? t.balancedSheet : t.unbalancedSheet}
                  </span>
                  {!balanceData.isBalanced && (
                    <span className="text-xs font-mono font-bold">
                      {t.difference}: {formatAmount(Math.abs(balanceData.totalAssets - (balanceData.totalLiabilities + balanceData.totalEquity)))}
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Detailed Balance Sheet */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ASSETS COLUMN */}
              <div className="lg:col-span-6 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                <h3 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                  {t.assetsTitle}
                </h3>
                {balanceData.assetItems.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">{t.noData}</p>
                ) : (
                  <div className="space-y-1">
                    {balanceData.assetItems.map(item => {
                      const padding = getIndentation(item.accountCode);
                      return (
                        <div 
                          key={item.accountId} 
                          className={`flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg hover:bg-gray-50/30 dark:hover:bg-gray-800/10 ${
                            item.isGroup ? 'font-bold bg-gray-50/20 dark:bg-gray-900/10' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-gray-400 w-[80px]">{item.accountCode}</span>
                            <span style={{ paddingRight: lang === 'ar' ? `${padding}px` : '0px', paddingLeft: lang === 'en' ? `${padding}px` : '0px' }}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatAmount(item.amount)}
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex justify-between items-center py-3.5 px-3 text-xs sm:text-sm border-t-2 border-double border-gray-100 dark:border-gray-800 font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                      <span>{t.totalAssetsSum}</span>
                      <span className="font-mono">{formatAmount(balanceData.totalAssets)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* LIABILITIES & EQUITY COLUMN */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Liabilities Sub-section */}
                <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-amber-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    {t.liabilitiesTitle}
                  </h3>
                  {balanceData.liabilityItems.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">{t.noData}</p>
                  ) : (
                    <div className="space-y-1">
                      {balanceData.liabilityItems.map(item => {
                        const padding = getIndentation(item.accountCode);
                        return (
                          <div 
                            key={item.accountId} 
                            className={`flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg hover:bg-gray-50/30 dark:hover:bg-gray-800/10 ${
                              item.isGroup ? 'font-bold bg-gray-50/20 dark:bg-gray-900/10' : 'text-gray-600 dark:text-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-[10px] text-gray-400 w-[80px]">{item.accountCode}</span>
                              <span style={{ paddingRight: lang === 'ar' ? `${padding}px` : '0px', paddingLeft: lang === 'en' ? `${padding}px` : '0px' }}>
                                {item.accountName}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                              {formatAmount(item.amount)}
                            </span>
                          </div>
                        );
                      })}

                      <div className="flex justify-between items-center py-3.5 px-3 text-xs sm:text-sm border-t-2 border-double border-gray-100 dark:border-gray-800 font-extrabold text-amber-500 mt-2">
                        <span>{t.totalLiabilitiesSum}</span>
                        <span className="font-mono">{formatAmount(balanceData.totalLiabilities)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Equity Sub-section */}
                <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    {t.equityTitle}
                  </h3>
                  <div className="space-y-1">
                    {balanceData.equityItems.map(item => {
                      const padding = getIndentation(item.accountCode);
                      return (
                        <div 
                          key={item.accountId} 
                          className={`flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg hover:bg-gray-50/30 dark:hover:bg-gray-800/10 ${
                            item.isGroup ? 'font-bold bg-gray-50/20 dark:bg-gray-900/10' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-gray-400 w-[80px]">{item.accountCode}</span>
                            <span style={{ paddingRight: lang === 'ar' ? `${padding}px` : '0px', paddingLeft: lang === 'en' ? `${padding}px` : '0px' }}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatAmount(item.amount)}
                          </span>
                        </div>
                      );
                    })}

                    {/* Net Income as of date row */}
                    <div className="flex justify-between items-center py-2 px-3 text-xs sm:text-sm rounded-lg bg-gray-50/30 dark:bg-gray-900/10 text-gray-600 dark:text-gray-300 font-bold border-l-2 border-emerald-500">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] text-gray-400 w-[80px]">-</span>
                        <span>{lang === 'ar' ? 'أرباح أو خسائر العام (صافي الدخل)' : 'Net Income (Retained Earnings)'}</span>
                      </div>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                        {formatAmount(balanceData.netIncome)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-3.5 px-3 text-xs sm:text-sm border-t-2 border-double border-gray-100 dark:border-gray-800 font-extrabold text-emerald-500 mt-2">
                      <span>{t.totalEquitySum}</span>
                      <span className="font-mono">{formatAmount(balanceData.totalEquity)}</span>
                    </div>
                  </div>
                </div>

                {/* Liability + Equity bottom summary verification */}
                <div className={`p-4 rounded-2xl shadow-xl font-black text-sm border flex justify-between items-center ${
                  balanceData.isBalanced 
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10'
                    : 'bg-rose-500 text-white border-rose-600 shadow-rose-500/10'
                }`}>
                  <span>{t.liabilityAndEquitySum}</span>
                  <span className="font-mono font-black">{formatAmount(balanceData.totalLiabilities + balanceData.totalEquity)}</span>
                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
