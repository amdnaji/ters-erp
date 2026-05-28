import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, UserPlus, AlertCircle, Building2, Globe, CheckCircle2, Hash, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/logo.png';

interface RegisterProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

const translations = {
  ar: {
    registerTitle: 'تسجيل منشأة جديدة',
    registerSubtitle: 'ابدأ فورا بتهيئة مساحتك المحاسبية للعمل فوراً',
    companyName: 'اسم المنشأة',
    companyNamePlaceholder: 'مثال: شركة الحلول الرقمية',
    companyCode: 'رمز الشركة (فريد وقصير)',
    companyCodePlaceholder: 'مثال: techzone (أحرف وأرقام إنجليزية فقط)',
    adminEmail: 'البريد الإلكتروني للمدير الإداري',
    adminEmailPlaceholder: 'admin@company.com',
    password: 'كلمة المرور (يجب ألا تقل عن 8 خانات)',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: '••••••••',
    passwordMismatch: 'كلمتا المرور غير متطابقتين.',
    registerBtn: 'تسجيل الحساب وإنشاء المنشأة',
    hasAccount: 'لديك منشأة مسجلة بالفعل؟',
    loginHere: 'تسجيل الدخول هنا',
    successTitle: 'تم تسجيل شركتك بنجاح!',
    successSubtitle: 'لقد قمنا بتهيئة دليل الحسابات الافتراضي بنجاح لشركتك.',
    successRedirect: 'يتم الآن تحويلك إلى صفحة تسجيل الدخول...',
    errorDefault: 'حدث خطأ غير متوقع أثناء تسجيل الشركة.',
    fieldRequired: 'هذا الحقل مطلوب.',
  },
  en: {
    registerTitle: 'Register New Organization',
    registerSubtitle: 'Initialize your accounting space instantly',
    companyName: 'Company Name',
    companyNamePlaceholder: 'e.g., Digital Solutions Co',
    companyCode: 'Company Code (Unique & Short)',
    companyCodePlaceholder: 'e.g., techzone (English alphanumeric only)',
    adminEmail: 'Admin Email Address',
    adminEmailPlaceholder: 'admin@company.com',
    password: 'Password (Minimum 8 characters)',
    passwordPlaceholder: '••••••••',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: '••••••••',
    passwordMismatch: 'Passwords do not match.',
    registerBtn: 'Register & Create Organization',
    hasAccount: 'Already have an organization registered?',
    loginHere: 'Sign in here',
    successTitle: 'Company Registered Successfully!',
    successSubtitle: 'We have successfully initialized your default Chart of Accounts.',
    successRedirect: 'Redirecting you to the login page...',
    errorDefault: 'An unexpected error occurred during company registration.',
    fieldRequired: 'This field is required.',
  }
};

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess, onNavigateToLogin }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [companyName, setCompanyName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = translations[lang];

  // Auto-generate company code based on English company name or input text
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    
    // Simplify name into an alphanumeric code stub (only if it matches English chars, else let user fill it)
    const stub = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Keep alphanumeric only
      .trim();
    
    if (stub) {
      setTenantCode(stub);
    }
    
    if (errors.tenantCode) {
      setErrors(prev => ({ ...prev, tenantCode: '' }));
    }
    if (errors.companyName) {
      setErrors(prev => ({ ...prev, companyName: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Perform inline validation
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) {
      newErrors.companyName = t.fieldRequired;
    }
    if (!tenantCode.trim()) {
      newErrors.tenantCode = t.fieldRequired;
    }
    if (!adminEmail.trim()) {
      newErrors.adminEmail = t.fieldRequired;
    }
    if (!password) {
      newErrors.password = t.fieldRequired;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = t.fieldRequired;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t.passwordMismatch;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const payload = {
      companyName,
      tenantCode,
      adminEmail,
      password,
    };

    try {
      await axios.post('/api/auth/register', payload);
      setLoading(false);
      setSuccess(true);
      
      // Auto-transition to login after success animation
      setTimeout(() => {
        onRegisterSuccess();
      }, 2500);
    } catch (err: any) {
      setLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.errors) {
        // Validation errors from ModelState
        const validationErrors = Object.values(err.response.data.errors).flat().join(' | ');
        setError(validationErrors);
      } else {
        setError(t.errorDefault);
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-6 relative overflow-y-auto transition-all duration-300"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Decorative background glows */}
      <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"></div>

      <div className="w-full max-w-2xl bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-10 relative z-10 animate-scale-in">
        
        {/* Language Switcher Button */}
        <div className={`absolute top-6 ${lang === 'ar' ? 'left-6' : 'right-6'}`}>
          <button
            type="button"
            onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#121318] dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400 transition-all active:scale-95 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
        </div>

        {success ? (
          /* Glowing Success Overlay */
          <div className="flex flex-col items-center justify-center text-center space-y-4 py-8 animate-scale-in">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-full shadow-inner animate-pulse">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{t.successTitle}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 max-w-[340px] mx-auto">
                {t.successSubtitle}
              </p>
              <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-4 animate-pulse">
                {t.successRedirect}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Brand/Header */}
            <div className="flex items-center gap-4 mb-6 pt-2">
              <img src={logoImg} className="w-12 h-12 rounded-xl shadow-lg shadow-purple-500/10 object-contain bg-[#121318] p-1.5 flex-shrink-0" alt="Ters ERP Logo" />
              <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{t.registerTitle}</div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t.registerSubtitle}</p>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs rounded-xl border border-rose-100 dark:border-rose-950/50 mb-6 font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {/* Company Name input */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    {t.companyName} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className={`absolute ${lang === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400`} />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      placeholder={t.companyNamePlaceholder}
                      dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      className={`w-full ${lang === 'ar' ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 text-sm bg-gray-50 border ${errors.companyName ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all font-medium`}
                    />
                  </div>
                  {errors.companyName && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                      {errors.companyName}
                    </span>
                  )}
                </div>

                {/* Company Code Input */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    {t.companyCode} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={tenantCode}
                      onChange={(e) => {
                        setTenantCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        if (errors.tenantCode) {
                          setErrors(prev => ({ ...prev, tenantCode: '' }));
                        }
                      }}
                      placeholder={t.companyCodePlaceholder}
                      dir="ltr"
                      className={`w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border ${errors.tenantCode ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all text-left font-medium`}
                    />
                  </div>
                  {errors.tenantCode && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                      {errors.tenantCode}
                    </span>
                  )}
                </div>

                {/* Admin Email input */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    {t.adminEmail} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        if (errors.adminEmail) {
                          setErrors(prev => ({ ...prev, adminEmail: '' }));
                        }
                      }}
                      placeholder={t.adminEmailPlaceholder}
                      dir="ltr"
                      className={`w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border ${errors.adminEmail ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all text-left font-medium`}
                    />
                  </div>
                  {errors.adminEmail && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                      {errors.adminEmail}
                    </span>
                  )}
                </div>

                {/* Password input */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    {t.password} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors(prev => ({ ...prev, password: '' }));
                        }
                        if (errors.confirmPassword && errors.confirmPassword === t.passwordMismatch) {
                          setErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                      placeholder={t.passwordPlaceholder}
                      dir="ltr"
                      className={`w-full pl-10 pr-10 py-3 text-sm bg-gray-50 border ${errors.password ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all text-left font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                      {errors.password}
                    </span>
                  )}
                </div>

                {/* Confirm Password input */}
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                    {t.confirmPassword} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) {
                          setErrors(prev => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
                      placeholder={t.confirmPasswordPlaceholder}
                      dir="ltr"
                      className={`w-full pl-10 pr-10 py-3 text-sm bg-gray-50 border ${errors.confirmPassword ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all text-left font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                      {errors.confirmPassword}
                    </span>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="w-4.5 h-4.5" />
                    <span>{t.registerBtn}</span>
                  </>
                )}
              </button>
            </form>

            {/* Navigation Switch */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/80 text-center">
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {t.hasAccount}{' '}
                <button
                  onClick={onNavigateToLogin}
                  className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                >
                  {t.loginHere}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
