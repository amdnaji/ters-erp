import { useState } from 'react';
import axios from 'axios';
import { 
  Database, 
  Building, 
  User, 
  Server, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  Globe, 
  Lock, 
  Mail, 
  ArrowRight, 
  ArrowLeft 
} from 'lucide-react';
import logoImg from '../../assets/logo.png';

interface SetupWizardProps {
  onSetupSuccess: () => void;
}

const translations = {
  ar: {
    title: 'تهيئة نظام ترس ERP',
    subtitle: 'مرحباً بك! دعنا نقم بتهيئة النظام الخاص بشركتك في خطوات بسيطة.',
    stepDb: 'بيانات قاعدة البيانات',
    stepCompany: 'بيانات الشركة',
    stepAdmin: 'حساب مسؤول النظام',
    stepInstall: 'تثبيت وتهيئة',
    dbChoice: 'اختر نوع قاعدة البيانات',
    sqliteTitle: 'SQLite (خفيف بنقرة واحدة - مستحسن)',
    sqliteDesc: 'قاعدة بيانات محلية سريعة وممتازة للتجارب والشركات الصغيرة والمحلات التجارية. لا تحتاج إلى أي تثبيت خارجي.',
    postgresTitle: 'PostgreSQL (متقدم - خادم مستقل)',
    postgresDesc: 'مناسب للشركات الكبيرة، والبيئات الإنتاجية عالية الأداء. يتطلب وجود خادم وقاعدة بيانات مستقلة ومثبتة.',
    dbHost: 'عنوان الخادم (Host)',
    dbPort: 'المنفذ (Port)',
    dbName: 'اسم قاعدة البيانات (Database)',
    dbUser: 'اسم المستخدم (Username)',
    dbPass: 'كلمة المرور (Password)',
    companyName: 'اسم الشركة',
    companyNamePlaceholder: 'مثال: شركة ترس للتجارة والمقاولات',
    tenantCode: 'رمز المجلد الضريبي / كود المؤسسة (Tenant Code)',
    tenantCodeDesc: 'رمز فريد باللغة الإنجليزية يحدد الهوية الضريبية لمؤسستك (بدون مسافات).',
    tenantCodePlaceholder: 'مثال: terscorp',
    adminEmail: 'البريد الإلكتروني للمسؤول',
    adminEmailPlaceholder: 'admin@company.com',
    adminPassword: 'كلمة المرور لمدير النظام',
    adminPasswordPlaceholder: '••••••••',
    btnNext: 'التالي',
    btnBack: 'السابق',
    btnInitialize: 'بدء تهيئة وتثبيت النظام 🚀',
    installingTitle: 'جاري تهيئة وتثبيت نظام ترس...',
    installingDesc: 'يرجى الانتظار، جاري إعداد وتشييد البنية التحتية والمحاسبية الخاصة بمؤسستك.',
    milestoneDb: 'تأسيس قاعدة البيانات وبناء الجداول الهيكلية...',
    milestoneCoa: 'توليد دليل الحسابات القياسي الموحد (الزكاة والضريبة)...',
    milestoneRoles: 'تهيئة مصفوفة الصلاحيات وأدوار النظام الافتراضية...',
    milestoneAdmin: 'إنشاء حساب مدير النظام وربط الهوية...',
    successTitle: 'تهانينا! تم تهيئة النظام بنجاح 🎉',
    successDesc: 'تم بناء وتشييد نظام ترس بالكامل وهو جاهز للعمل الآن. سنقوم بنقلك إلى لوحة القيادة فوراً...',
    errorTitle: 'حدث خطأ أثناء عملية التهيئة',
  },
  en: {
    title: 'Setup & Initialize Ters ERP',
    subtitle: 'Welcome! Let us initialize your enterprise resource planning system in a few simple steps.',
    stepDb: 'Database Engine',
    stepCompany: 'Company Details',
    stepAdmin: 'System Administrator',
    stepInstall: 'Setup & Install',
    dbChoice: 'Choose Database Engine',
    sqliteTitle: 'SQLite (Lightweight One-Click - Recommended)',
    sqliteDesc: 'Fast local database ideal for trials, small enterprises, and local shops. Requires zero external installation.',
    postgresTitle: 'PostgreSQL (Advanced - Dedicated Server)',
    postgresDesc: 'Best for enterprise deployments, high concurrency, and production. Requires a pre-installed Postgres server.',
    dbHost: 'Host Server',
    dbPort: 'Port',
    dbName: 'Database Name',
    dbUser: 'Username',
    dbPass: 'Password',
    companyName: 'Company Name',
    companyNamePlaceholder: 'e.g. Ters Trading & Contracting Co.',
    tenantCode: 'Unique Organization Code (Tenant Code)',
    tenantCodeDesc: 'A unique English slug identifying your company boundary (alphanumeric, no spaces).',
    tenantCodePlaceholder: 'e.g. terscorp',
    adminEmail: 'Admin Email Address',
    adminEmailPlaceholder: 'admin@company.com',
    adminPassword: 'Admin Secure Password',
    adminPasswordPlaceholder: '••••••••',
    btnNext: 'Next',
    btnBack: 'Back',
    btnInitialize: 'Initialize & Boot System 🚀',
    installingTitle: 'Initializing Ters ERP Engine...',
    installingDesc: 'Please wait while we provision your company infrastructure and core accounting ledgers.',
    milestoneDb: 'Creating database structures & dynamic entity tables...',
    milestoneCoa: 'Generating standard ZATCA-compliant Chart of Accounts...',
    milestoneRoles: 'Configuring default authorization matrix and roles...',
    milestoneAdmin: 'Registering administrative superuser accounts...',
    successTitle: 'Awesome! System Initialized 🎉',
    successDesc: 'Ters ERP has been fully provisioned and is ready for use. Redirecting you to the dashboard...',
    errorTitle: 'System Initialization Failed',
  }
};

export function SetupWizard({ onSetupSuccess }: SetupWizardProps) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [dbProvider, setDbProvider] = useState<'SQLite' | 'PostgreSQL'>('SQLite');
  
  // PostgreSQL Form Settings
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('ters_erp_db');
  const [dbUser, setDbUser] = useState('postgres');
  const [dbPass, setDbPass] = useState('admin');

  // Company Form Settings
  const [companyName, setCompanyName] = useState('');
  const [tenantCode, setTenantCode] = useState('');

  // Admin Account Settings
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Installation States
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const t = translations[lang];

  const handleNext = () => {
    if (step === 2) {
      if (!companyName.trim()) {
        alert(lang === 'ar' ? 'يرجى إدخال اسم الشركة' : 'Please enter company name');
        return;
      }
      if (!tenantCode.trim() || !/^[a-zA-Z0-9]+$/.test(tenantCode)) {
        alert(lang === 'ar' ? 'يرجى إدخال رمز الشركة بالإنجليزية وبدون مسافات أو رموز خاصة' : 'Please enter a valid alphanumeric tenant code (no spaces)');
        return;
      }
    }
    if (step === 3) {
      if (!adminEmail.trim() || !adminEmail.includes('@')) {
        alert(lang === 'ar' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address');
        return;
      }
      if (adminPassword.length < 8) {
        alert(lang === 'ar' ? 'كلمة المرور يجب أن لا تقل عن 8 خانات' : 'Password must be at least 8 characters');
        return;
      }
    }
    setStep((s) => (s + 1) as any);
  };

  const handleBack = () => {
    setStep((s) => (s - 1) as any);
  };

  const startInstallation = async () => {
    setInstallStatus('installing');
    setErrorMessage('');
    
    // Simulate milestones with clean visuals
    setActiveMilestone(1); // Provision database
    await new Promise(r => setTimeout(r, 1200));
    
    setActiveMilestone(2); // Seed Chart of accounts
    await new Promise(r => setTimeout(r, 1000));
    
    setActiveMilestone(3); // Seed security matrix
    await new Promise(r => setTimeout(r, 1000));
    
    setActiveMilestone(4); // Provision admin login
    
    try {
      const payload = {
        dbProvider,
        host: dbProvider === 'PostgreSQL' ? dbHost : null,
        port: dbProvider === 'PostgreSQL' ? dbPort : null,
        database: dbProvider === 'PostgreSQL' ? dbName : null,
        username: dbProvider === 'PostgreSQL' ? dbUser : null,
        password: dbProvider === 'PostgreSQL' ? dbPass : null,
        companyName,
        tenantCode: tenantCode.toLowerCase(),
        adminEmail,
        adminPassword
      };

      await axios.post('/api/setup/initialize', payload);
      
      setInstallStatus('success');
      await new Promise(r => setTimeout(r, 1500));
      onSetupSuccess();
    } catch (err: any) {
      setInstallStatus('error');
      const msg = err.response?.data?.message || err.response?.data?.AdminPassword?.[0] || 'Unknown error occurred';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-[#121318] flex flex-col justify-between overflow-y-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Header */}
      <header className="p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-[#1a1b22]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={logoImg} className="w-10 h-10 rounded-xl shadow-md object-contain" alt="Ters Logo" />
          <span className="font-black text-base text-gray-900 dark:text-gray-100 tracking-wide">
            {t.title}
          </span>
        </div>
        <button
          onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/35 border border-purple-100/65 dark:border-purple-900/35 text-xs font-bold text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </header>

      {/* Setup Wizard Central Frame */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white dark:bg-[#1a1b22] rounded-3xl border border-gray-100 dark:border-gray-800/80 shadow-2xl overflow-hidden relative p-8">
          
          {installStatus === 'idle' && (
            <>
              {/* Stepper Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-850">
                <div className={`flex flex-col items-center flex-1 ${step >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 mb-1 transition-all ${step >= 1 ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20' : 'border-gray-300'}`}>
                    1
                  </span>
                  <span className="text-[10px] font-black">{t.stepDb}</span>
                </div>
                <div className={`h-0.5 flex-1 bg-gray-200 dark:bg-gray-800 mx-2 mb-4 ${step > 1 && 'bg-purple-500'}`} />
                <div className={`flex flex-col items-center flex-1 ${step >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 mb-1 transition-all ${step >= 2 ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20' : 'border-gray-300'}`}>
                    2
                  </span>
                  <span className="text-[10px] font-black">{t.stepCompany}</span>
                </div>
                <div className={`h-0.5 flex-1 bg-gray-200 dark:bg-gray-800 mx-2 mb-4 ${step > 2 && 'bg-purple-500'}`} />
                <div className={`flex flex-col items-center flex-1 ${step >= 3 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border-2 mb-1 transition-all ${step >= 3 ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20' : 'border-gray-300'}`}>
                    3
                  </span>
                  <span className="text-[10px] font-black">{t.stepAdmin}</span>
                </div>
              </div>

              {/* Step 1: Database Engine Selection */}
              {step === 1 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-gray-850 dark:text-gray-200 flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-500" />
                    {t.dbChoice}
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* SQLite Option */}
                    <div 
                      onClick={() => setDbProvider('SQLite')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none relative flex flex-col justify-between h-44 ${
                        dbProvider === 'SQLite'
                          ? 'border-purple-600 bg-purple-50/10 dark:bg-purple-950/10'
                          : 'border-gray-200 dark:border-gray-800 hover:border-purple-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-200">{t.sqliteTitle}</h3>
                          <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${dbProvider === 'SQLite' ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300'}`}>
                            {dbProvider === 'SQLite' && <span className="text-[9px]">✓</span>}
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-450 leading-relaxed">
                          {t.sqliteDesc}
                        </p>
                      </div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-purple-600 dark:text-purple-400">
                        {lang === 'ar' ? 'التشغيل الفوري (One-Click)' : 'Instant Setup'}
                      </span>
                    </div>

                    {/* PostgreSQL Option */}
                    <div 
                      onClick={() => setDbProvider('PostgreSQL')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer select-none relative flex flex-col justify-between h-44 ${
                        dbProvider === 'PostgreSQL'
                          ? 'border-purple-600 bg-purple-50/10 dark:bg-purple-950/10'
                          : 'border-gray-200 dark:border-gray-800 hover:border-purple-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-xs text-gray-800 dark:text-gray-200">{t.postgresTitle}</h3>
                          <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center ${dbProvider === 'PostgreSQL' ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300'}`}>
                            {dbProvider === 'PostgreSQL' && <span className="text-[9px]">✓</span>}
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-450 leading-relaxed">
                          {t.postgresDesc}
                        </p>
                      </div>
                      <span className="text-[9px] uppercase font-black tracking-wider text-gray-400">
                        {lang === 'ar' ? 'متقدم للإنتاج' : 'Enterprise Production'}
                      </span>
                    </div>
                  </div>

                  {/* PostgreSQL Dynamic Connection form */}
                  {dbProvider === 'PostgreSQL' && (
                    <div className="p-4 bg-gray-50 dark:bg-[#121318]/50 rounded-2xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3 mt-4 animate-fadeIn">
                      <div className="col-span-2 flex items-center gap-2 border-b border-gray-150 dark:border-gray-800 pb-2 mb-1">
                        <Server className="w-4 h-4 text-purple-500" />
                        <span className="text-[10px] font-black uppercase text-gray-400">{lang === 'ar' ? 'إعدادات قاعدة بيانات PostgreSQL' : 'PostgreSQL Database Settings'}</span>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">{t.dbHost}</label>
                        <input 
                          type="text" 
                          value={dbHost}
                          onChange={(e) => setDbHost(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-200 dark:border-gray-850 dark:bg-[#1a1b22] rounded-xl focus:border-purple-500 outline-none text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">{t.dbPort}</label>
                        <input 
                          type="text" 
                          value={dbPort}
                          onChange={(e) => setDbPort(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-200 dark:border-gray-850 dark:bg-[#1a1b22] rounded-xl focus:border-purple-500 outline-none text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">{t.dbName}</label>
                        <input 
                          type="text" 
                          value={dbName}
                          onChange={(e) => setDbName(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-200 dark:border-gray-850 dark:bg-[#1a1b22] rounded-xl focus:border-purple-500 outline-none text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">{t.dbUser}</label>
                        <input 
                          type="text" 
                          value={dbUser}
                          onChange={(e) => setDbUser(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-200 dark:border-gray-850 dark:bg-[#1a1b22] rounded-xl focus:border-purple-500 outline-none text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">{t.dbPass}</label>
                        <input 
                          type="password" 
                          value={dbPass}
                          onChange={(e) => setDbPass(e.target.value)}
                          className="w-full p-2 text-xs border border-gray-200 dark:border-gray-850 dark:bg-[#1a1b22] rounded-xl focus:border-purple-500 outline-none text-gray-800 dark:text-gray-100 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {t.btnNext}
                      {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Company Setup */}
              {step === 2 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-gray-855 dark:text-gray-200 flex items-center gap-2">
                    <Building className="w-5 h-5 text-purple-500" />
                    {t.stepCompany}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1.5">{t.companyName}</label>
                      <input 
                        type="text" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder={t.companyNamePlaceholder}
                        className="w-full p-3 text-xs border border-gray-200 dark:border-gray-800 dark:bg-[#121318] rounded-xl focus:border-purple-500 outline-none text-gray-850 dark:text-gray-100 font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1">{t.tenantCode}</label>
                      <span className="text-[10px] text-gray-400 block mb-2">{t.tenantCodeDesc}</span>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={tenantCode}
                          onChange={(e) => setTenantCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          placeholder={t.tenantCodePlaceholder}
                          className="w-full p-3 text-xs border border-gray-200 dark:border-gray-800 dark:bg-[#121318] rounded-xl focus:border-purple-500 outline-none text-gray-850 dark:text-gray-100 font-mono font-bold uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={handleBack}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 text-gray-600 dark:text-gray-400 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                      {t.btnBack}
                    </button>
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-purple-600 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/10 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {t.btnNext}
                      {lang === 'ar' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Administrator Details */}
              {step === 3 && (
                <div className="space-y-6">
                  <h2 className="text-lg font-black text-gray-855 dark:text-gray-200 flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    {t.stepAdmin}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1.5">{t.adminEmail}</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <input 
                          type="email" 
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          placeholder={t.adminEmailPlaceholder}
                          className="w-full p-3 pl-10 text-xs border border-gray-200 dark:border-gray-800 dark:bg-[#121318] rounded-xl focus:border-purple-500 outline-none text-gray-850 dark:text-gray-100 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-400 block mb-1.5">{t.adminPassword}</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                        <input 
                          type="password" 
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder={t.adminPasswordPlaceholder}
                          className="w-full p-3 pl-10 text-xs border border-gray-200 dark:border-gray-800 dark:bg-[#121318] rounded-xl focus:border-purple-500 outline-none text-gray-850 dark:text-gray-100 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={handleBack}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-850 hover:bg-gray-200 text-gray-600 dark:text-gray-400 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {lang === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                      {t.btnBack}
                    </button>
                    <button
                      onClick={startInstallation}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-500/20 cursor-pointer transition-all active:scale-98"
                    >
                      {t.btnInitialize}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 4: Installation Progress Screen */}
          {installStatus === 'installing' && (
            <div className="py-8 flex flex-col items-center text-center space-y-6">
              <RefreshCw className="w-12 h-12 text-purple-500 animate-spin" />
              <div className="space-y-2">
                <h2 className="text-base font-black text-gray-855 dark:text-gray-100">{t.installingTitle}</h2>
                <p className="text-xs text-gray-450 max-w-md">{t.installingDesc}</p>
              </div>

              {/* Progress Milestones Checklist */}
              <div className="w-full max-w-md bg-gray-50 dark:bg-[#121318]/40 border border-gray-100 dark:border-gray-800/80 rounded-2xl p-5 text-start space-y-3">
                <div className={`flex items-center gap-3 text-xs ${activeMilestone >= 1 ? 'font-bold text-gray-850 dark:text-gray-200' : 'text-gray-400'}`}>
                  {activeMilestone > 1 ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeMilestone === 1 ? 'border-purple-500 animate-pulse bg-purple-500/10' : 'border-gray-300'}`} />
                  )}
                  <span>{t.milestoneDb}</span>
                </div>

                <div className={`flex items-center gap-3 text-xs ${activeMilestone >= 2 ? 'font-bold text-gray-850 dark:text-gray-200' : 'text-gray-400'}`}>
                  {activeMilestone > 2 ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeMilestone === 2 ? 'border-purple-500 animate-pulse bg-purple-500/10' : 'border-gray-300'}`} />
                  )}
                  <span>{t.milestoneCoa}</span>
                </div>

                <div className={`flex items-center gap-3 text-xs ${activeMilestone >= 3 ? 'font-bold text-gray-850 dark:text-gray-200' : 'text-gray-400'}`}>
                  {activeMilestone > 3 ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeMilestone === 3 ? 'border-purple-500 animate-pulse bg-purple-500/10' : 'border-gray-300'}`} />
                  )}
                  <span>{t.milestoneRoles}</span>
                </div>

                <div className={`flex items-center gap-3 text-xs ${activeMilestone >= 4 ? 'font-bold text-gray-855 dark:text-gray-200' : 'text-gray-400'}`}>
                  {activeMilestone > 4 ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeMilestone === 4 ? 'border-purple-500 animate-pulse bg-purple-500/10' : 'border-gray-300'}`} />
                  )}
                  <span>{t.milestoneAdmin}</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Setup Success */}
          {installStatus === 'success' && (
            <div className="py-10 flex flex-col items-center text-center space-y-5 animate-scaleIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black text-gray-855 dark:text-gray-150">{t.successTitle}</h2>
                <p className="text-xs text-gray-450 max-w-sm leading-relaxed">{t.successDesc}</p>
              </div>
            </div>
          )}

          {/* Installation Error State */}
          {installStatus === 'error' && (
            <div className="py-8 flex flex-col items-center text-center space-y-6 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center">
                <Key className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-black text-gray-855 dark:text-gray-100">{t.errorTitle}</h2>
                <p className="text-xs text-rose-500 font-bold max-w-md bg-rose-50/50 dark:bg-rose-950/10 p-3.5 rounded-xl border border-rose-100/50 dark:border-rose-950/25">
                  {errorMessage}
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={() => {
                    setInstallStatus('idle');
                    setStep(3);
                  }}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-750 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  {lang === 'ar' ? 'رجوع لتصحيح البيانات' : 'Go Back & Correct'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Branding */}
      <footer className="p-4 text-center border-t border-gray-100 dark:border-gray-800/80 bg-white/40 dark:bg-[#1a1b22]/40 text-[10px] text-gray-450 select-none">
        <p dir="ltr">
          Ters ERP v0.1.0-beta.1 | Built with ❤️ in 🇸🇦
        </p>
      </footer>
    </div>
  );
}
