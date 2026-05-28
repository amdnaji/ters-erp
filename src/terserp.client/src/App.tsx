import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LogOut, 
  User, 
  RefreshCw, 
  Globe, 
  BookOpen, 
  Layers, 
  Shield, 
  BarChart2, 
  FileText,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Boxes,
  Wallet,
  UsersRound,
  FileSpreadsheet
} from 'lucide-react';
import logoImg from './assets/logo.png';
import { ChartOfAccounts } from './pages/accounting/ChartOfAccounts';
import { Journals } from './pages/accounting/Journals';
import { SecuritySettings } from './pages/settings/SecuritySettings';
import { FinancialReports } from './pages/reports/FinancialReports';
import { Customers } from './pages/accounting/Customers';
import { Invoices } from './pages/accounting/Invoices';
import { Vendors } from './pages/accounting/Vendors';
import { VendorInvoices } from './pages/accounting/VendorInvoices';
import { Inventory } from './pages/accounting/Inventory';
import { Payroll } from './pages/accounting/Payroll';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { SetupWizard } from './pages/auth/SetupWizard';

interface UserSession {
  email: string;
  tenantId: string;
  roleName: string | null;
  permissions: Record<string, { create: boolean; read: boolean; update: boolean; delete: boolean }>;
}

const appTranslations = {
  ar: {
    appName: 'ترس ERP',
    logout: 'تسجيل الخروج',
    securingSession: 'جاري التحقق من الجلسة الآمنة...',
    accountingSection: 'المحاسبة العامة',
    salesSection: 'العملاء والمبيعات',
    purchaseSection: 'المشتريات والمخازن',
    hrSection: 'الموارد البشرية والرواتب',
    systemSection: 'الإعدادات والأمان',
  },
  en: {
    appName: 'Ters ERP',
    logout: 'Log Out',
    securingSession: 'Verifying secure session...',
    accountingSection: 'General Ledger',
    salesSection: 'Sales & CRM',
    purchaseSection: 'Purchase & Inventory',
    hrSection: 'HR & Expenses',
    systemSection: 'System & Security',
  }
};

function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [view, setView] = useState<'login' | 'register' | 'accounts' | 'journals' | 'security' | 'reports' | 'customers' | 'invoices' | 'vendors' | 'vendorinvoices' | 'inventory' | 'payroll'>(() => {
    const hash = window.location.hash.replace('#/', '');
    if (hash === 'register') return 'register';
    if (hash === 'accounts') return 'accounts';
    if (hash === 'journals') return 'journals';
    if (hash === 'security') return 'security';
    if (hash === 'reports') return 'reports';
    if (hash === 'customers') return 'customers';
    if (hash === 'invoices') return 'invoices';
    if (hash === 'vendors') return 'vendors';
    if (hash === 'vendorinvoices') return 'vendorinvoices';
    if (hash === 'inventory') return 'inventory';
    if (hash === 'payroll') return 'payroll';
    return 'login';
  });
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  
  const t = appTranslations[lang];

  // Helper function to check granular CRUD permissions
  const hasPermission = (scope: string, action: 'create' | 'read' | 'update' | 'delete'): boolean => {
    if (!user) return false;
    if (user.roleName === 'Administrator') return true;
    return user.permissions?.[scope]?.[action] ?? false;
  };

  const navigate = (newView: 'login' | 'register' | 'accounts' | 'journals' | 'security' | 'reports' | 'customers' | 'invoices' | 'vendors' | 'vendorinvoices' | 'inventory' | 'payroll') => {
    setView(newView);
    window.location.hash = `#/${newView}`;
  };

  // Sync state with browser back/forward buttons (hashchange event)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validViews = ['login', 'register', 'accounts', 'journals', 'security', 'reports', 'customers', 'invoices', 'vendors', 'vendorinvoices', 'inventory', 'payroll'];
      if (validViews.includes(hash)) {
        setView(hash as any);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update browser tab titles dynamically based on active view and language
  useEffect(() => {
    const titles: Record<'ar' | 'en', Record<string, string>> = {
      ar: {
        accounts: 'دليل الحسابات',
        journals: 'القيود المحاسبية اليومية',
        customers: 'إدارة العملاء',
        invoices: 'فواتير المبيعات',
        vendors: 'إدارة الموردين',
        vendorinvoices: 'فواتير المشتريات',
        inventory: 'جرد المستودعات والمنتجات',
        payroll: 'مسيرات شؤون الموظفين والرواتب',
        reports: 'التقارير المالية والقوائم',
        security: 'الصلاحيات والأمان',
        login: 'تسجيل الدخول',
        register: 'إنشاء حساب جديد',
      },
      en: {
        accounts: 'Chart of Accounts',
        journals: 'Double-Entry Journal Entries',
        customers: 'Customers Directory',
        invoices: 'Sales Invoicing',
        vendors: 'Vendors Directory',
        vendorinvoices: 'Purchase Invoicing',
        inventory: 'Warehouse & Stock Control',
        payroll: 'HR & Employee Payroll',
        reports: 'Financial Reports',
        security: 'Security & Roles',
        login: 'Login Portal',
        register: 'Tenant Registration',
      }
    };

    const prefix = lang === 'ar' ? 'ترس' : 'Ters';
    const pageTitle = titles[lang]?.[view] || '';
    document.title = pageTitle ? `${prefix} - ${pageTitle}` : prefix;
  }, [view, lang]);

  // Check current session status on application mount
  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data && response.data.email) {
        const perms = response.data.permissions || {};
        const role = response.data.roleName;
        const isAdmin = role === 'Administrator';

        setUser({
          email: response.data.email,
          tenantId: response.data.tenantId,
          roleName: role,
          permissions: perms
        });

        // Determine if user has a deep link they want to go to
        const currentHash = window.location.hash.replace('#/', '');
        const validViews = ['accounts', 'journals', 'security', 'reports', 'customers', 'invoices', 'vendors', 'vendorinvoices', 'inventory', 'payroll'];
        if (validViews.includes(currentHash)) {
          let hasAccess = false;
          if (isAdmin) {
            hasAccess = true;
          } else if (currentHash === 'accounts' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'journals' && perms['JournalEntries']?.read) {
            hasAccess = true;
          } else if (currentHash === 'security' && perms['Users']?.read) {
            hasAccess = true;
          } else if (currentHash === 'reports' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'customers' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'invoices' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'vendors' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'vendorinvoices' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'inventory' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          } else if (currentHash === 'payroll' && perms['ChartOfAccounts']?.read) {
            hasAccess = true;
          }

          if (hasAccess) {
            navigate(currentHash as any);
            setLoading(false);
            return;
          }
        }

        // Determine fallback view based on available read permissions
        if (isAdmin || perms['ChartOfAccounts']?.read) {
          navigate('accounts');
        } else if (perms['JournalEntries']?.read) {
          navigate('journals');
        } else if (perms['Users']?.read) {
          navigate('security');
        } else {
          navigate('accounts');
        }
      } else {
        setUser(null);
        const currentHash = window.location.hash.replace('#/', '');
        if (currentHash === 'register') {
          navigate('register');
        } else {
          navigate('login');
        }
      }
      setLoading(false);
    } catch (err) {
      setUser(null);
      const currentHash = window.location.hash.replace('#/', '');
      if (currentHash === 'register') {
          navigate('register');
      } else {
          navigate('login');
      }
      setLoading(false);
    }
  };

  const checkSetupStatus = async () => {
    try {
      const response = await axios.get('/api/setup/status');
      if (response.data && response.data.isConfigured === false) {
        setIsConfigured(false);
        setLoading(false);
        return false;
      }
      setIsConfigured(true);
      return true;
    } catch (err) {
      setIsConfigured(true);
      return true;
    }
  };

  useEffect(() => {
    const initApp = async () => {
      const configured = await checkSetupStatus();
      if (configured) {
        checkSession();
      }
    };
    initApp();
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      // Ignore network errors on logout to allow local session clearance
    } finally {
      setUser(null);
      navigate('login');
    }
  };

  // 1. Loading Shimmer
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-gray-50 dark:bg-[#121318] flex flex-col items-center justify-center space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <img src={logoImg} className="w-16 h-16 rounded-2xl shadow-lg shadow-purple-500/10 object-contain bg-[#1a1b22] animate-pulse" alt="Ters ERP Logo" />
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-bold">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
          <span>{t.securingSession}</span>
        </div>
      </div>
    );
  }

  // 1.5 Setup Wizard View
  if (isConfigured === false) {
    return (
      <SetupWizard 
        onSetupSuccess={() => {
          setIsConfigured(true);
          checkSession();
        }} 
      />
    );
  }

  // 2. Unauthenticated Views
  if (!user) {
    if (view === 'register') {
      return (
        <Register 
          onRegisterSuccess={() => navigate('login')} 
          onNavigateToLogin={() => navigate('login')} 
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={() => {
          checkSession();
        }} 
        onNavigateToRegister={() => navigate('register')} 
      />
    );
  }

  // 3. Authenticated Dashboard Layout with Sidebar
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#121318] flex overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Dynamic Sidebar */}
      <aside 
        className={`h-screen bg-white dark:bg-[#1a1b22] border-r border-l border-gray-100 dark:border-gray-800/80 flex flex-col flex-shrink-0 transition-all duration-300 z-50 shadow-xl ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden select-none">
            <img src={logoImg} className="w-9 h-9 rounded-xl shadow shadow-purple-500/10 object-contain" alt="Ters ERP Logo" />
            {sidebarOpen && (
              <span className="font-black text-sm text-gray-900 dark:text-gray-100 tracking-wide truncate">
                {t.appName}
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-855 rounded-lg text-gray-400 hover:text-purple-650 cursor-pointer"
          >
            {sidebarOpen ? (
              lang === 'ar' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
            ) : (
              lang === 'ar' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 py-4 overflow-y-auto px-3 space-y-5 select-none">
          
          {/* SECTION 1: ACCOUNTING */}
          {hasPermission('ChartOfAccounts', 'read') && (
            <div className="space-y-1">
              {sidebarOpen && (
                <span className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  {t.accountingSection}
                </span>
              )}
              <button
                onClick={() => navigate('accounts')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'accounts'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <Layers className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'دليل الحسابات' : 'Chart of Accounts'}</span>}
              </button>
              <button
                onClick={() => navigate('journals')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'journals'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'القيود اليومية' : 'Journal Entries'}</span>}
              </button>
            </div>
          )}

          {/* SECTION 2: SALES */}
          {hasPermission('ChartOfAccounts', 'read') && (
            <div className="space-y-1">
              {sidebarOpen && (
                <span className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  {t.salesSection}
                </span>
              )}
              <button
                onClick={() => navigate('customers')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'customers'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'العملاء' : 'Customers Directory'}</span>}
              </button>
              <button
                onClick={() => navigate('invoices')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'invoices'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}</span>}
              </button>
            </div>
          )}

          {/* SECTION 3: PURCHASING & WAREHOUSE */}
          {hasPermission('ChartOfAccounts', 'read') && (
            <div className="space-y-1">
              {sidebarOpen && (
                <span className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  {t.purchaseSection}
                </span>
              )}
              <button
                onClick={() => navigate('vendors')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'vendors'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <UsersRound className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'الموردين' : 'Vendors Directory'}</span>}
              </button>
              <button
                onClick={() => navigate('vendorinvoices')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'vendorinvoices'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <Wallet className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'فواتير المشتريات' : 'Purchase Invoices'}</span>}
              </button>
              <button
                onClick={() => navigate('inventory')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'inventory'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <Boxes className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'المخازن والمخزون' : 'Inventory & Products'}</span>}
              </button>
            </div>
          )}

          {/* SECTION 4: HR & PAYROLL */}
          {hasPermission('ChartOfAccounts', 'read') && (
            <div className="space-y-1">
              {sidebarOpen && (
                <span className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  {t.hrSection}
                </span>
              )}
              <button
                onClick={() => navigate('payroll')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'payroll'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'مسيرات الرواتب' : 'Payroll Runs'}</span>}
              </button>
            </div>
          )}

          {/* SECTION 5: SYSTEM */}
          <div className="space-y-1">
            {sidebarOpen && (
              <span className="px-3 text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                {t.systemSection}
              </span>
            )}
            {hasPermission('ChartOfAccounts', 'read') && (
              <button
                onClick={() => navigate('reports')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'reports'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <BarChart2 className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'التقارير المالية' : 'Financial Reports'}</span>}
              </button>
            )}
            {hasPermission('Users', 'read') && (
              <button
                onClick={() => navigate('security')}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-3 ${
                  view === 'security'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/10'
                    : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50/50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/20'
                }`}
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{lang === 'ar' ? 'الصلاحيات والأمان' : 'Security & Roles'}</span>}
              </button>
            )}
          </div>

        </div>

        {/* Sidebar Footer (Profile Card) */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 bg-gray-50/50 dark:bg-gray-900/10 flex-shrink-0">
          
          <div className="flex items-center gap-2 p-1.5 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm flex-shrink-0">
              {user.email.substring(0, 2)}
            </div>
            {sidebarOpen && (
              <div className="flex flex-col items-start leading-none overflow-hidden select-none">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate w-36">
                  {user.email}
                </span>
                {user.roleName && (
                  <span className="text-[8px] text-purple-500 dark:text-purple-400 font-black uppercase mt-0.5 tracking-wide truncate">
                    {user.roleName}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 mt-1">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className={`p-1.5 bg-white hover:bg-gray-100 border border-gray-200/60 dark:bg-gray-850 dark:hover:bg-gray-800 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer ${
                sidebarOpen ? 'flex-1' : 'w-full'
              }`}
              title={lang === 'ar' ? 'English' : 'العربية'}
            >
              <Globe className="w-3.5 h-3.5 text-purple-500" />
              {sidebarOpen && <span>{lang === 'ar' ? 'English' : 'العربية'}</span>}
            </button>

            {sidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 border border-rose-200 dark:border-rose-900/40 bg-rose-50/10 hover:bg-rose-50 text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/20 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer flex-1"
                title={t.logout}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            )}
          </div>

          {!sidebarOpen && (
            <button
              onClick={handleLogout}
              className="p-2 border border-rose-200 dark:border-rose-900/40 bg-rose-50/10 hover:bg-rose-50 text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/20 font-bold text-xs rounded-lg transition-all flex items-center justify-center cursor-pointer w-full"
              title={t.logout}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

        </div>

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        
        {/* Dynamic Top Bar */}
        <header className="bg-white/80 dark:bg-[#1a1b22]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/80 px-6 py-3.5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 select-none">
            <LayoutDashboard className="w-4 h-4 text-purple-500" />
            <span className="text-[10px] uppercase font-black tracking-wider text-gray-400">
              {lang === 'ar' ? 'مساحة العمل النشطة' : 'Active Tenant Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-[10px] font-black bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-100/65 dark:border-purple-900/40 select-none">
              v0.1.0-beta.1
            </span>
          </div>
        </header>

        {/* View Content Port (Scrollable) */}
        <main className="flex-1 overflow-y-auto">
          {view === 'journals' && hasPermission('JournalEntries', 'read') && (
            <Journals lang={lang} hasPermission={hasPermission} />
          )}
          {view === 'accounts' && hasPermission('ChartOfAccounts', 'read') && (
            <ChartOfAccounts lang={lang} hasPermission={hasPermission} />
          )}
          {view === 'customers' && hasPermission('ChartOfAccounts', 'read') && (
            <Customers lang={lang} />
          )}
          {view === 'invoices' && hasPermission('ChartOfAccounts', 'read') && (
            <Invoices lang={lang} />
          )}
          {view === 'vendors' && hasPermission('ChartOfAccounts', 'read') && (
            <Vendors lang={lang} />
          )}
          {view === 'vendorinvoices' && hasPermission('ChartOfAccounts', 'read') && (
            <VendorInvoices lang={lang} />
          )}
          {view === 'inventory' && hasPermission('ChartOfAccounts', 'read') && (
            <Inventory lang={lang} />
          )}
          {view === 'payroll' && hasPermission('ChartOfAccounts', 'read') && (
            <Payroll lang={lang} />
          )}
          {view === 'reports' && hasPermission('ChartOfAccounts', 'read') && (
            <FinancialReports lang={lang} />
          )}
          {view === 'security' && hasPermission('Users', 'read') && (
            <SecuritySettings lang={lang} />
          )}
          {!hasPermission('ChartOfAccounts', 'read') && !hasPermission('JournalEntries', 'read') && !hasPermission('Users', 'read') && (
            <div className="flex flex-col items-center justify-center p-16 text-center text-gray-400 min-h-[60vh]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <Shield className="w-14 h-14 text-rose-500 animate-pulse mb-4" />
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">
                {lang === 'ar' ? 'عذراً، ليس لديك أي صلاحيات نشطة حالياً' : 'Access Restricted - No Active Permissions'}
              </h2>
              <p className="text-xs text-gray-500 mt-2 max-w-sm leading-relaxed">
                {lang === 'ar' 
                  ? 'يرجى التواصل مع مدير النظام الخاص بشركتك لإسناد دور مالي وتفعيل مصفوفة الصلاحيات الخاصة بك للبدء في استخدام النظام.'
                  : 'Please contact your system administrator to assign a job role and configure your permission matrix to start using the system.'}
              </p>
            </div>
          )}
        </main>

      </div>

    </div>
  );
}

export default App;
