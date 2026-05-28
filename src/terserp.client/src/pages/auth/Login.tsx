

import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, LogIn, AlertCircle, Globe, Hash, Eye, EyeOff } from 'lucide-react';
import logoImg from '../../assets/logo.png';

interface LoginProps {
  onLoginSuccess: (email: string, tenantId: string) => void;
  onNavigateToRegister: () => void;
}

const translations = {
  ar: {
    loginTitle: 'مرحباً بك في نظام ترس لإدارة الموارد',
    loginSubtitle: 'الرجاء تسجيل الدخول للوصول إلى لوحة تحكم المنشأة',
    companyCode: 'رمز الشركة',
    companyCodePlaceholder: 'مثال: techzone',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'name@company.com',
    password: 'كلمة المرور',
    passwordPlaceholder: '••••••••',
    loginBtn: 'تسجيل الدخول',
    noAccount: 'ليس لديك منشأة مسجلة؟',
    registerNow: 'سجل شركتك الآن مجاناً',
    errorDefault: 'البريد الإلكتروني أو كلمة المرور غير صحيحة، أو تعذر الاتصال بالخادم.',
    fieldRequired: 'هذا الحقل مطلوب.',
    rememberMe: 'تذكرني',
  },
  en: {
    loginTitle: 'Welcome to Ters Resource Planning System',
    loginSubtitle: 'Please sign in to access your organization dashboard',
    companyCode: 'Company Code',
    companyCodePlaceholder: 'e.g., techzone',
    email: 'Email Address',
    emailPlaceholder: 'name@company.com',
    password: 'Password',
    passwordPlaceholder: '••••••••',
    loginBtn: 'Sign In',
    noAccount: "Don't have an organization registered?",
    registerNow: 'Register your company now for free',
    errorDefault: 'Invalid email or password, or server connection failed.',
    fieldRequired: 'This field is required.',
    rememberMe: 'Remember me',
  }
};

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [tenantCode, setTenantCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    // Perform inline validation
    const newErrors: Record<string, string> = {};
    if (!tenantCode.trim()) {
      newErrors.tenantCode = t.fieldRequired;
    }
    if (!email.trim()) {
      newErrors.email = t.fieldRequired;
    }
    if (!password) {
      newErrors.password = t.fieldRequired;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Send credentials to backend login endpoint (including tenantCode and rememberMe)
      const response = await axios.post('/api/auth/login', { tenantCode, email, password, rememberMe });
      setLoading(false);
      onLoginSuccess(response.data.email, response.data.tenantId);
    } catch (err: any) {
      setLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
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

      <div className="w-full max-w-[480px] bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-10 relative z-10 animate-scale-in">
        
        {/* Language Switcher Button (Top Right in absolute coordinate of container) */}
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





        {/* Brand/Header - Horizontal layout using div to completely bypass global h1 CSS margins */}
        <div className="flex items-center gap-4 mb-6 pt-2">
          <img src={logoImg} className="w-12 h-12 rounded-xl shadow-lg shadow-purple-500/10 object-contain bg-[#121318] p-1.5 flex-shrink-0" alt="Ters ERP Logo" />
          <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
            <div className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{t.loginTitle}</div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t.loginSubtitle}</p>
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
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          
          {/* Company Code input */}
          <div>
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
                  setTenantCode(e.target.value);
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

          {/* Email input */}
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
              {t.email} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) {
                    setErrors(prev => ({ ...prev, email: '' }));
                  }
                }}
                placeholder={t.emailPlaceholder}
                dir="ltr"
                className={`w-full pl-10 pr-4 py-3 text-sm bg-gray-50 border ${errors.email ? 'border-rose-400 dark:border-rose-500/50 focus:ring-rose-500/20 focus:border-rose-500' : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500/20 focus:border-purple-500'} dark:bg-[#121318] dark:text-white rounded-xl outline-none transition-all text-left font-medium`}
              />
            </div>
            {errors.email && (
              <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1 block animate-fade-in">
                {errors.email}
              </span>
            )}
          </div>

          {/* Password input */}
          <div>
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

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between py-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 border-gray-200 dark:border-gray-800 dark:bg-[#121318] focus:ring-purple-500/20 focus:ring-offset-0 focus:ring-2 accent-purple-600 transition-all cursor-pointer"
              />
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                {t.rememberMe}
              </span>
            </label>
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
                <LogIn className="w-4.5 h-4.5" />
                <span>{t.loginBtn}</span>
              </>
            )}
          </button>
        </form>

        {/* Navigation Switch */}
        <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/80 text-center">
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t.noAccount}{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline cursor-pointer"
            >
              {t.registerNow}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
