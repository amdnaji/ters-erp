import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Save, 
  CheckCircle,
  AlertCircle,
  UserPlus
} from 'lucide-react';

interface CustomersProps {
  lang: 'ar' | 'en';
}

interface CustomerDto {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const translations = {
  ar: {
    title: 'إدارة العملاء',
    subtitle: 'إضافة ومتابعة وتعديل بيانات العملاء والمنشآت المتعامل معها.',
    addBtn: 'إضافة عميل جديد',
    nameCol: 'اسم العميل / المنشأة',
    emailCol: 'البريد الإلكتروني',
    phoneCol: 'رقم الهاتف',
    actionsCol: 'العمليات',
    noCustomers: 'لا يوجد عملاء مسجلين حالياً.',
    loading: 'جاري تحميل بيانات العملاء...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    successAdd: 'تم إضافة العميل بنجاح.',
    successUpdate: 'تم تحديث بيانات العميل بنجاح.',
    successDelete: 'تم حذف العميل بنجاح.',
    deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا العميل؟',
    modalTitleAdd: 'إضافة عميل جديد',
    modalTitleEdit: 'تعديل بيانات العميل',
    labelName: 'اسم العميل',
    labelEmail: 'البريد الإلكتروني',
    labelPhone: 'رقم الجوال / الهاتف',
    btnCancel: 'إلغاء',
    btnSave: 'حفظ البيانات',
  },
  en: {
    title: 'Customers Directory',
    subtitle: 'Add, update, and manage your company\'s business clients.',
    addBtn: 'Add New Customer',
    nameCol: 'Customer Name / Company',
    emailCol: 'Email Address',
    phoneCol: 'Phone Number',
    actionsCol: 'Actions',
    noCustomers: 'No customers registered yet.',
    loading: 'Loading customer directory...',
    errorDefault: 'An unexpected error occurred.',
    successAdd: 'Customer added successfully.',
    successUpdate: 'Customer details updated successfully.',
    successDelete: 'Customer deleted successfully.',
    deleteConfirm: 'Are you sure you want to delete this customer?',
    modalTitleAdd: 'Add New Customer',
    modalTitleEdit: 'Edit Customer Details',
    labelName: 'Customer Name',
    labelEmail: 'Email Address',
    labelPhone: 'Phone Number',
    btnCancel: 'Cancel',
    btnSave: 'Save Customer',
  }
};

export const Customers: React.FC<CustomersProps> = ({ lang }) => {
  const t = translations[lang];
  const [customers, setCustomers] = useState<CustomerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<CustomerDto[]>('/api/customers');
      setCustomers(res.data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: CustomerDto) => {
    setModalMode('edit');
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerEmail(customer.email);
    setCustomerPhone(customer.phone);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: customerName,
      email: customerEmail,
      phone: customerPhone
    };

    try {
      if (modalMode === 'add') {
        await axios.post('/api/customers', payload);
        setSuccessMsg(t.successAdd);
      } else {
        await axios.put(`/api/customers/${selectedCustomerId}`, payload);
        setSuccessMsg(t.successUpdate);
      }

      setIsModalOpen(false);
      await loadCustomers();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await axios.delete(`/api/customers/${id}`);
      setSuccessMsg(t.successDelete);
      await loadCustomers();
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
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'علاقات العملاء والمبيعات' : 'CRM & Accounts Receivable'}
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
              onClick={handleOpenAddModal}
              className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addBtn}</span>
            </button>
            <button
              onClick={loadCustomers}
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

        {/* Customers Table / Grid */}
        <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl">
          {customers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
              <p className="text-xs">{t.noCustomers}</p>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-right border-collapse text-xs sm:text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-3.5">{t.nameCol}</th>
                    <th className="px-6 py-3.5">{t.emailCol}</th>
                    <th className="px-6 py-3.5">{t.phoneCol}</th>
                    <th className="px-6 py-3.5 text-center">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                  {customers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all">
                      <td className="px-6 py-4 font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                          {customer.name.substring(0, 2)}
                        </div>
                        <span>{customer.name}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{customer.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{customer.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: Add / Edit Customer */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <UserPlus className="w-5 h-5 text-purple-500" />
                <span>{modalMode === 'add' ? t.modalTitleAdd : t.modalTitleEdit}</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.labelName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. شركة التوريدات السعودية / Saudi Supplies Co"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.labelEmail}
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="info@clientcompany.com"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.labelPhone}
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+966 50 000 0000"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.btnCancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{t.btnSave}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
