import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Info } from 'lucide-react';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parentId: string | null;
  parentName: string | null;
  parentCode: string | null;
  accountType: number | null;
  lang: 'ar' | 'en';
}

const ACCOUNT_TYPES = [
  { value: 1, labelAr: 'أصول', labelEn: 'Assets', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50' },
  { value: 2, labelAr: 'التزامات', labelEn: 'Liabilities', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50' },
  { value: 3, labelAr: 'حقوق ملكية', labelEn: 'Equity', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/50' },
  { value: 4, labelAr: 'إيرادات', labelEn: 'Revenue', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50' },
  { value: 5, labelAr: 'مصروفات', labelEn: 'Expenses', color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900/50' },
];

const translations = {
  ar: {
    titleAddRoot: 'إضافة حساب رئيسي',
    titleAddSub: 'إضافة حساب فرعي',
    underAccount: 'تحت الحساب:',
    createRootSubtitle: 'إنشاء حساب جذري جديد في شجرة دليل الحسابات',
    accountTypeLabel: 'نوع الحساب (مورث من الحساب الأب)',
    accountCodeLabel: 'رمز الحساب (Code)',
    codePlaceholder: 'مثال: 110101',
    isGroupLabel: 'حساب رئيسي (مجموعة)',
    isGroupSubtitle: 'يحتوي على حسابات فرعية تحته',
    nameLabel: 'اسم الحساب',
    namePlaceholder: 'مثال: الصندوق الرئيسي',
    saveBtn: 'حفظ وإضافة الحساب',
    cancelBtn: 'إلغاء',
    errorDefault: 'حدث خطأ غير متوقع أثناء إضافة الحساب.',
  },
  en: {
    titleAddRoot: 'Add Root Account',
    titleAddSub: 'Add Sub-Account',
    underAccount: 'Under Account:',
    createRootSubtitle: 'Create a new root account in the Chart of Accounts',
    accountTypeLabel: 'Account Type (Inherited from Parent)',
    accountCodeLabel: 'Account Code',
    codePlaceholder: 'e.g., 110101',
    isGroupLabel: 'Main Account (Group)',
    isGroupSubtitle: 'Contains sub-accounts under it',
    nameLabel: 'Account Name',
    namePlaceholder: 'e.g., Main Cash Box',
    saveBtn: 'Save Account',
    cancelBtn: 'Cancel',
    errorDefault: 'An unexpected error occurred while adding the account.',
  }
};

export const AccountFormModal: React.FC<AccountFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  parentId,
  parentName,
  parentCode,
  accountType,
  lang,
}) => {
  const t = translations[lang];
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [selectedType, setSelectedType] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName('');
      setIsGroup(false);
      
      // Auto-inherit type from parent if available, else default to 1 (Assets)
      if (accountType !== null) {
        setSelectedType(accountType);
      } else {
        setSelectedType(1);
      }

      // Prefill sub-account code base if parent exists to guide the user
      if (parentCode) {
        setCode(parentCode);
      } else {
        setCode('');
      }
    }
  }, [isOpen, parentCode, accountType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      code,
      name,
      type: selectedType,
      parentId,
      isGroup,
    };

    try {
      // API call to create account
      await axios.post('/api/accounts', payload);
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setLoading(false);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else if (err.response && err.response.data && err.response.data.errors) {
        // Validation errors from ModelState
        const validationErrors = Object.values(err.response.data.errors).flat().join(' | ');
        setError(validationErrors);
      } else {
        setError(err.message || t.errorDefault);
      }
    }
  };

  const inheritedTypeObj = ACCOUNT_TYPES.find(t => t.value === selectedType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#1f2028] border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all transform scale-100 animate-scale-in"
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-lg">
              <Plus className="w-5 h-5" />
            </div>
            <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                {parentId ? t.titleAddSub : t.titleAddRoot}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {parentId ? `${t.underAccount} ${parentName} (${parentCode})` : t.createRootSubtitle}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-sm rounded-xl border border-rose-100 dark:border-rose-950/50 font-medium">
              <Info className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Type (Read-only if inherited) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{t.accountTypeLabel}</label>
            {parentId && inheritedTypeObj ? (
              <div className={`inline-flex items-center px-3.5 py-1.5 rounded-xl border text-sm font-medium ${inheritedTypeObj.color}`}>
                {lang === 'ar' ? inheritedTypeObj.labelAr : inheritedTypeObj.labelEn}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5">
                {ACCOUNT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      selectedType === type.value
                        ? 'border-purple-500 bg-purple-50/50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-transparent dark:text-gray-400 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <span>{lang === 'ar' ? type.labelAr : type.labelEn}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Account Code */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t.accountCodeLabel}</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t.codePlaceholder}
                className={`w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 dark:bg-[#1a1b22] dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm outline-none ${lang === 'ar' ? 'text-right' : 'text-left font-mono'}`}
              />
            </div>

            {/* Is Group / Checklist Option */}
            <div className="col-span-2 sm:col-span-1 flex items-end pb-1.5">
              <label className="flex items-center gap-2.5 p-2 rounded-xl border border-gray-100 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-all w-full select-none">
                <input
                  type="checkbox"
                  checked={isGroup}
                  onChange={(e) => setIsGroup(e.target.checked)}
                  className="w-4.5 h-4.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 dark:border-gray-800 dark:bg-[#16171d] cursor-pointer"
                />
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.isGroupLabel}</span>
                  <span className="text-[10px] text-gray-400">{t.isGroupSubtitle}</span>
                </div>
              </label>
            </div>
          </div>

          {/* Account Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{t.nameLabel}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              className="w-full px-3.5 py-2 border border-gray-200 dark:border-gray-800 dark:bg-[#1a1b22] dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm outline-none text-right"
            />
          </div>

          {/* Modal Footer / Actions */}
          <div className="flex items-center gap-3 pt-3.5 border-t border-gray-100 dark:border-gray-800/80">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t.saveBtn}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-200 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition-all cursor-pointer"
            >
              {t.cancelBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
