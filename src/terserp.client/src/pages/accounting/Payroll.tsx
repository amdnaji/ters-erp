import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Save, 
  CreditCard, 
  UserCheck, 
  Calendar,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';

interface PayrollProps {
  lang: 'ar' | 'en';
}

interface EmployeeDto {
  id: string;
  name: string;
  jobTitle: string;
  department: string;
  basicSalary: number;
  allowances: number;
  hireDate: string;
}

interface PayrollSlipDto {
  id: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  isPaid: boolean;
}

const translations = {
  ar: {
    title: 'شؤون الموظفين والرواتب',
    subtitle: 'إدارة ملفات الموظفين، إصدار مسيرات الرواتب الشهرية، والترحيل المحاسبي لصرف الأجور.',
    tabEmployees: 'ملفات الموظفين',
    tabPayroll: 'مسيرات الرواتب الشهرية',
    addEmployee: 'إضافة موظف جديد',
    nameCol: 'اسم الموظف',
    jobCol: 'المسمى الوظيفي',
    deptCol: 'القسم',
    salaryCol: 'الراتب الأساسي',
    allowanceCol: 'البدلات',
    hireCol: 'تاريخ التعيين',
    actionsCol: 'العمليات',
    noEmployees: 'لا يوجد موظفين مسجلين حالياً.',
    noSlips: 'لا يوجد مسير رواتب نشط لهذا الشهر.',
    loading: 'جاري تحميل البيانات...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    successAddEmp: 'تم إضافة الموظف بنجاح.',
    successUpdateEmp: 'تم تحديث ملف الموظف بنجاح.',
    successDeleteEmp: 'تم حذف الموظف بنجاح.',
    successPay: 'تم صرف الراتب وتوليد القيد المحاسبي باليومية العامة تلقائياً بنجاح!',
    deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا الموظف؟',
    modalTitleAdd: 'إضافة موظف جديد للمنشأة',
    modalTitleEdit: 'تعديل ملف الموظف',
    labelName: 'اسم الموظف الكامل',
    labelJob: 'المسمى الوظيفي',
    labelDept: 'القسم الإداري',
    labelBasic: 'الراتب الأساسي الشهري',
    labelAllowances: 'إجمالي البدلات شهرياً',
    btnCancel: 'إلغاء',
    btnSave: 'حفظ الموظف',
    labelMonth: 'الشهر',
    labelYear: 'السنة',
    btnGenerate: 'توليد مسير الرواتب الآن',
    grossCol: 'إجمالي المستحق',
    netCol: 'صافي الراتب',
    payBtn: 'اعتماد وصرف الراتب',
    statusPaid: 'مصدق ومصروف',
    statusUnpaid: 'معلق للصرف'
  },
  en: {
    title: 'HR & Payroll Ledger',
    subtitle: 'Manage employee directories, generate monthly payroll sheets, and post payment expense entries.',
    tabEmployees: 'Employee Directory',
    tabPayroll: 'Monthly Payroll Run',
    addEmployee: 'Add New Employee',
    nameCol: 'Employee Name',
    jobCol: 'Job Title',
    deptCol: 'Department',
    salaryCol: 'Basic Salary',
    allowanceCol: 'Allowances',
    hireCol: 'Hire Date',
    actionsCol: 'Actions',
    noEmployees: 'No registered employees found.',
    noSlips: 'No payroll slips generated for this period.',
    loading: 'Loading directory...',
    errorDefault: 'An unexpected error occurred.',
    successAddEmp: 'Employee added successfully.',
    successUpdateEmp: 'Employee details updated successfully.',
    successDeleteEmp: 'Employee deleted successfully.',
    successPay: 'Salary paid & dynamic journal entry posted to GL successfully.',
    deleteConfirm: 'Are you sure you want to delete this employee?',
    modalTitleAdd: 'Register New Employee',
    modalTitleEdit: 'Edit Employee details',
    labelName: 'Full Employee Name',
    labelJob: 'Job Title',
    labelDept: 'Department',
    labelBasic: 'Basic Monthly Salary',
    labelAllowances: 'Monthly Allowances',
    btnCancel: 'Cancel',
    btnSave: 'Save Employee',
    labelMonth: 'Month',
    labelYear: 'Year',
    btnGenerate: 'Generate Monthly Payroll',
    grossCol: 'Gross Salary',
    netCol: 'Net Salary',
    payBtn: 'Approve & Pay Salary',
    statusPaid: 'Approved & Paid',
    statusUnpaid: 'Pending Payment'
  }
};

export const Payroll: React.FC<PayrollProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll'>('employees');

  // Data States
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [payrollSlips, setPayrollSlips] = useState<PayrollSlipDto[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Employee Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empJob, setEmpJob] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empBasic, setEmpBasic] = useState(0);
  const [empAllowances, setEmpAllowances] = useState(0);

  // Payroll Generator Form
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, slipsRes] = await Promise.all([
        axios.get<EmployeeDto[]>('/api/employees'),
        axios.get<PayrollSlipDto[]>('/api/payroll')
      ]);
      setEmployees(empRes.data);
      setPayrollSlips(slipsRes.data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedEmpId(null);
    setEmpName('');
    setEmpJob('');
    setEmpDept('');
    setEmpBasic(0);
    setEmpAllowances(0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeDto) => {
    setModalMode('edit');
    setSelectedEmpId(emp.id);
    setEmpName(emp.name);
    setEmpJob(emp.jobTitle);
    setEmpDept(emp.department);
    setEmpBasic(emp.basicSalary);
    setEmpAllowances(emp.allowances);
    setIsModalOpen(true);
  };

  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: empName,
      jobTitle: empJob,
      department: empDept,
      basicSalary: Number(empBasic),
      allowances: Number(empAllowances)
    };

    try {
      if (modalMode === 'add') {
        await axios.post('/api/employees', payload);
        setSuccessMsg(t.successAddEmp);
      } else {
        await axios.put(`/api/employees/${selectedEmpId}`, payload);
        setSuccessMsg(t.successUpdateEmp);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await axios.delete(`/api/employees/${id}`);
      setSuccessMsg(t.successDeleteEmp);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  // Process and generate dynamic payroll
  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await axios.post(`/api/payroll/generate?month=${payrollMonth}&year=${payrollYear}`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  // Pay individual Salary slip and trigger immediate GL post
  const handlePaySalary = async (id: string) => {
    setError(null);
    setSuccessMsg(null);

    try {
      await axios.post(`/api/payroll/${id}/pay`);
      setSuccessMsg(t.successPay);
      
      // Update state locally for real-time responsiveness
      setPayrollSlips(prev => prev.map(slip => {
        if (slip.id === id) {
          return { ...slip, isPaid: true };
        }
        return slip;
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
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

  // Filter slips for the current selector
  const activeSlips = payrollSlips.filter(s => s.month === payrollMonth && s.year === payrollYear);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 animate-scale-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl shadow-purple-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Users className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'الموارد البشرية والمصروفات' : 'Human Capital & Salaries'}
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

        {/* Tab Selectors */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 p-1 bg-white dark:bg-[#1a1b22] rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab('employees')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'employees'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{t.tabEmployees}</span>
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'payroll'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.tabPayroll}</span>
          </button>
        </div>

        {/* TAB 1: Employees Directory */}
        {activeTab === 'employees' && (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-gray-50 dark:border-gray-800/40">
              <h3 className="text-sm font-bold text-gray-450 dark:text-gray-300">
                {t.tabEmployees} ({employees.length})
              </h3>
              <button
                onClick={handleOpenAdd}
                className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addEmployee}</span>
              </button>
            </div>

            {employees.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs">{t.noEmployees}</p>
              </div>
            ) : (
              <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse text-xs sm:text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                      <th className="px-6 py-3.5">{t.nameCol}</th>
                      <th className="px-6 py-3.5">{t.jobCol}</th>
                      <th className="px-6 py-3.5">{t.deptCol}</th>
                      <th className="px-6 py-3.5">{t.salaryCol}</th>
                      <th className="px-6 py-3.5">{t.allowanceCol}</th>
                      <th className="px-6 py-3.5 text-center">{t.actionsCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all font-medium">
                        <td className="px-6 py-4 font-bold flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {emp.name.substring(0, 2)}
                          </div>
                          <span>{emp.name}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{emp.jobTitle}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{emp.department}</td>
                        <td className="px-6 py-4 font-bold">{emp.basicSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-purple-600 dark:text-purple-400">{emp.allowances.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEdit(emp)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
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
        )}

        {/* TAB 2: Payroll Run Sheet */}
        {activeTab === 'payroll' && (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-6 animate-scale-in">
            {/* Run config */}
            <form onSubmit={handleGeneratePayroll} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/60">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">
                  {t.labelMonth}
                </label>
                <select
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 font-bold cursor-pointer"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">
                  {t.labelYear}
                </label>
                <select
                  value={payrollYear}
                  onChange={(e) => setPayrollYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 font-bold cursor-pointer"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting || employees.length === 0}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t.btnGenerate}</span>
                </button>
              </div>
            </form>

            {/* Slips table */}
            {activeSlips.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileSpreadsheet className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs">{t.noSlips}</p>
              </div>
            ) : (
              <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse text-xs sm:text-sm font-medium" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                      <th className="px-6 py-3.5">{t.nameCol}</th>
                      <th className="px-6 py-3.5">{t.grossCol}</th>
                      <th className="px-6 py-3.5">{t.netCol}</th>
                      <th className="px-6 py-3.5 text-center">{t.actionsCol}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                    {activeSlips.map(slip => (
                      <tr key={slip.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all">
                        <td className="px-6 py-4 font-bold">{slip.employeeName}</td>
                        <td className="px-6 py-4">{slip.grossSalary.toLocaleString()}</td>
                        <td className="px-6 py-4 font-black text-gray-950 dark:text-white">
                          {slip.netSalary.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            {slip.isPaid ? (
                              <span className="px-3 py-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/30 select-none">
                                {t.statusPaid}
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePaySalary(slip.id)}
                                className="py-1 px-3 bg-purple-650 hover:bg-purple-750 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{t.payBtn}</span>
                              </button>
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
        )}

        {/* MODAL: Employee registration */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-purple-500" />
                <span>{modalMode === 'add' ? t.modalTitleAdd : t.modalTitleEdit}</span>
              </h3>

              <form onSubmit={handleEmployeeSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                    {t.labelName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. أحمد الحربي / Ahmed Al-Harbi"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelJob}
                    </label>
                    <input
                      type="text"
                      value={empJob}
                      onChange={(e) => setEmpJob(e.target.value)}
                      placeholder="e.g. Accountant Manager"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelDept}
                    </label>
                    <input
                      type="text"
                      value={empDept}
                      onChange={(e) => setEmpDept(e.target.value)}
                      placeholder="e.g. Finance"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelBasic}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={empBasic}
                      onChange={(e) => setEmpBasic(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelAllowances}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={empAllowances}
                      onChange={(e) => setEmpAllowances(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
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
