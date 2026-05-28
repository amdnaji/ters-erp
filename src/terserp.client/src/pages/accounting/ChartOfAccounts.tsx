import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle, 
  BookOpen, 
  Database,
  TrendingUp,
  Briefcase,
  Wallet
} from 'lucide-react';
import { AccountTree } from '../../components/accounting/AccountTree';
import type { AccountNodeDto } from '../../components/accounting/AccountTree';
import { AccountFormModal } from '../../components/accounting/AccountFormModal';

interface ChartOfAccountsProps {
  lang: 'ar' | 'en';
  hasPermission: (scope: string, action: 'create' | 'read' | 'update' | 'delete') => boolean;
}

const translations = {
  ar: {
    accountingModule: 'المحاسبة المالية',
    chartOfAccounts: 'دليل الحسابات',
    chartOfAccountsSubtitle: 'تصفح وإدارة الهيكل التنظيمي المالي لجميع الحسابات الرئيسية والفرعية الخاصة بالمنشأة.',
    addRootAccount: 'إضافة حساب رئيسي',
    seedDefaultChart: 'تثبيت الدليل الافتراضي',
    totalAccounts: 'إجمالي الحسابات',
    groupAccounts: 'المجموعات الرئيسية',
    ledgerAccounts: 'الحسابات الفرعية (دفتر الأستاذ)',
    totalBalance: 'إجمالي الأرصدة المدخلة',
    searchPlaceholder: 'ابحث برمز الحساب، الاسم بالعربية أو الإنجليزية...',
    expandAll: 'توسيع الكل',
    collapseAll: 'طي الكل',
    loadingAccounts: 'جاري تحميل دليل الحسابات...',
    retry: 'إعادة المحاولة',
    seedError: 'حدث خطأ أثناء تثبيت شجرة دليل الحسابات الافتراضية.',
    loadError: 'تعذر الاتصال بالخادم لجلب دليل الحسابات. يُرجى التحقق من تشغيل واجهة الـ API الخلفية.',
    serverInvalidData: 'البيانات المستلمة من الخادم ليست شجرة حسابات صالحة. قد يكون خادم التطوير بحاجة إلى إعادة تشغيل.',
  },
  en: {
    accountingModule: 'Financial Accounting',
    chartOfAccounts: 'Chart of Accounts',
    chartOfAccountsSubtitle: 'Browse and manage the organizational financial structure of all main and sub-accounts of the entity.',
    addRootAccount: 'Add Root Account',
    seedDefaultChart: 'Seed Default Chart',
    totalAccounts: 'Total Accounts',
    groupAccounts: 'Group Accounts',
    ledgerAccounts: 'Sub-accounts (Ledger)',
    totalBalance: 'Total Entered Balances',
    searchPlaceholder: 'Search by account code, Arabic or English name...',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    loadingAccounts: 'Loading Chart of Accounts...',
    retry: 'Retry',
    seedError: 'An error occurred while seeding the default chart of accounts.',
    loadError: 'Unable to connect to server to fetch chart of accounts. Please check if the backend API is running.',
    serverInvalidData: 'The received data is not a valid chart of accounts. The dev server may need to be restarted.',
  }
};

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({
  lang,
  hasPermission,
}) => {
  const t = translations[lang];
  const [treeData, setTreeData] = useState<AccountNodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Controls expanding all nodes: true = expand all, false = collapse all, null = manual individual toggles
  const [globalExpanded, setGlobalExpanded] = useState<boolean | null>(null);

  // Seeding trigger loading state
  const [seeding, setSeeding] = useState(false);

  // Form Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedParentName, setSelectedParentName] = useState<string | null>(null);
  const [selectedParentCode, setSelectedParentCode] = useState<string | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState<number | null>(null);

  // Fetch all accounts tree
  const fetchTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<AccountNodeDto[]>('/api/accounts/tree');
      if (Array.isArray(response.data)) {
        setTreeData(response.data);
      } else {
        throw new Error(t.serverInvalidData);
      }
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setTreeData([]); // Ensure fallback to empty array
      setError(
        err.response?.data?.message || 
        err.message ||
        t.loadError
      );
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // Triggered when clicking "+" on a group account
  const handleAddSubAccount = (parentId: string, parentName: string, parentCode: string, accountType: number) => {
    setSelectedParentId(parentId);
    setSelectedParentName(parentName);
    setSelectedParentCode(parentCode);
    setSelectedAccountType(accountType);
    setIsModalOpen(true);
  };

  // Triggered when clicking the top level "+ إضافة حساب رئيسي"
  const handleAddRootAccount = () => {
    setSelectedParentId(null);
    setSelectedParentName(null);
    setSelectedParentCode(null);
    setSelectedAccountType(null);
    setIsModalOpen(true);
  };

  // Seed default Simplified Chart of Accounts
  const handleSeedDefaultChart = async () => {
    setSeeding(true);
    setError(null);
    try {
      await axios.post('/api/accounts/seed');
      await fetchTree();
      setSeeding(false);
    } catch (err: any) {
      setSeeding(false);
      setError(
        err.response?.data?.message || 
        t.seedError
      );
    }
  };

  // Calculate quick metrics for the dashboard cards
  const getMetrics = () => {
    let totalCount = 0;
    let groupCount = 0;
    let ledgerCount = 0;
    let totalBalance = 0;

    if (!Array.isArray(treeData)) {
      return { totalCount, groupCount, ledgerCount, totalBalance };
    }

    const countNodes = (nodes: AccountNodeDto[]) => {
      if (!Array.isArray(nodes)) return;
      nodes.forEach(node => {
        totalCount++;
        if (node.isGroup) {
          groupCount++;
        } else {
          ledgerCount++;
          // Only add balance for actual transaction/ledger accounts to avoid double-counting groups
          totalBalance += node.balance;
        }
        if (node.children) {
          countNodes(node.children);
        }
      });
    };

    countNodes(treeData);
    return { totalCount, groupCount, ledgerCount, totalBalance };
  };

  const metrics = getMetrics();

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
                  {t.accountingModule}
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {t.chartOfAccounts}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t.chartOfAccountsSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {hasPermission('ChartOfAccounts', 'create') && (
              <button
                onClick={handleAddRootAccount}
                className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addRootAccount}</span>
              </button>
            )}
            
            {treeData.length === 0 && !loading && (
              <button
                onClick={handleSeedDefaultChart}
                disabled={seeding}
                className="py-2.5 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-950/70 font-semibold text-xs sm:text-sm rounded-xl border border-indigo-100 dark:border-indigo-900/40 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {seeding ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span>{t.seedDefaultChart}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Accounts */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4.5 rounded-2xl shadow-xl shadow-purple-500/[0.01] flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.totalAccounts}</p>
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">{loading ? '...' : metrics.totalCount}</h3>
            </div>
          </div>

          {/* Card 2: Group Accounts */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4.5 rounded-2xl shadow-xl shadow-purple-500/[0.01] flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.groupAccounts}</p>
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">{loading ? '...' : metrics.groupCount}</h3>
            </div>
          </div>

          {/* Card 3: Ledger Accounts */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4.5 rounded-2xl shadow-xl shadow-purple-500/[0.01] flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.ledgerAccounts}</p>
              <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">{loading ? '...' : metrics.ledgerCount}</h3>
            </div>
          </div>

          {/* Card 4: Total Balance */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4.5 rounded-2xl shadow-xl shadow-purple-500/[0.01] flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.totalBalance}</p>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 font-mono truncate mt-0.5">
                {loading ? '...' : new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'SAR' }).format(metrics.totalBalance)}
              </h3>
            </div>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-4 rounded-xl shadow-sm">
          {/* Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute ${lang === 'ar' ? 'right-3.5' : 'left-3.5'} top-2.5 w-4 h-4 text-gray-400`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlaceholder}
              className={`w-full ${lang === 'ar' ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'} py-1.5 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all`}
            />
          </div>

          {/* Expand / Collapse and Refresh Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGlobalExpanded(true)}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-lg transition-all text-xs flex items-center gap-1.5 font-bold cursor-pointer"
              title={t.expandAll}
            >
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">{t.expandAll}</span>
            </button>
            
            <button
              onClick={() => setGlobalExpanded(false)}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-lg transition-all text-xs flex items-center gap-1.5 font-bold cursor-pointer"
              title={t.collapseAll}
            >
              <ChevronUp className="w-4 h-4" />
              <span className="hidden sm:inline">{t.collapseAll}</span>
            </button>

            <button
              onClick={fetchTree}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="flex gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-sm rounded-2xl border border-rose-100 dark:border-rose-950/40 font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span>{error}</span>
            </div>
            <button 
              onClick={fetchTree} 
              className="text-xs bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 px-3 py-1 rounded-lg transition-all cursor-pointer"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* Main Tree Card or Elegant Skeleton Loader */}
        {loading ? (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            {/* Shimmer loading headers */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-1/4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
              <div className="w-1/3 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
            </div>
            {/* Shimmer loading rows */}
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex justify-between items-center py-3.5" style={{ paddingRight: `${(idx % 3) * 20}px` }}>
                <div className="flex items-center gap-3 w-1/2">
                  <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                  <div className="w-8 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse font-mono"></div>
                  <div className="w-32 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                </div>
                <div className="flex gap-4 w-1/4 justify-end">
                  <div className="w-12 h-5 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                  <div className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AccountTree
            data={treeData}
            onAddSubAccount={handleAddSubAccount}
            searchTerm={searchTerm}
            globalExpanded={globalExpanded}
            lang={lang}
            canCreate={hasPermission('ChartOfAccounts', 'create')}
          />
        )}

        {/* Sub-account/Root creation dialog modal */}
        <AccountFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchTree}
          parentId={selectedParentId}
          parentName={selectedParentName}
          parentCode={selectedParentCode}
          accountType={selectedAccountType}
          lang={lang}
        />

      </div>
    </div>
  );
};
