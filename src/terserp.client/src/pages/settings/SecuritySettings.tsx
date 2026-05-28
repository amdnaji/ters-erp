import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, 
  Users, 
  Lock, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Save, 
  UserCheck, 
  Info
} from 'lucide-react';

interface SecuritySettingsProps {
  lang: 'ar' | 'en';
}

interface RolePermissionDto {
  scope: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

interface TenantRoleDto {
  id: string;
  name: string;
  roleName: string;
  description: string;
  isSystem: boolean;
  permissions: RolePermissionDto[];
}

interface UserWithRoleDto {
  id: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
}

const translations = {
  ar: {
    title: 'لوحة التحكم الأمني والصلاحيات',
    subtitle: 'إدارة الأدوار الوظيفية، تحديد مصفوفة الصلاحيات، وإسناد المسؤوليات لموظفي المنشأة.',
    tabRoles: 'أدوار النظام والصلاحيات',
    tabUsers: 'أدوار الموظفين والمستخدمين',
    addRoleBtn: 'إنشاء دور مالي جديد',
    roleName: 'اسم الدور',
    roleDesc: 'الوصف الوظيفي',
    isSystemRole: 'دور نظام افتراضي',
    customRole: 'دور مخصص للمنشأة',
    permissionMatrix: 'مصفوفة الصلاحيات التفصيلية',
    scopeHeader: 'النطاق / النظام الفرعي',
    readCol: 'استعراض',
    createCol: 'إنشاء',
    updateCol: 'تعديل',
    deleteCol: 'حذف',
    savePermissionsBtn: 'حفظ تغييرات الصلاحيات',
    adminBypassAlert: 'لا يمكن تعديل صلاحيات مدير النظام الافتراضي - يمتلك الصلاحيات كاملة تلقائياً.',
    userEmail: 'البريد الإلكتروني للموظف',
    assignedRole: 'الدور الوظيفي الحالي',
    changeRolePlaceholder: 'اختر دوراً لإسناده...',
    assignRoleSuccess: 'تم تغيير الدور الوظيفي للموظف بنجاح.',
    saveRoleSuccess: 'تم حفظ الصلاحيات بنجاح.',
    createRoleSuccess: 'تم إنشاء الدور الوظيفي الجديد بنجاح.',
    createUserSuccess: 'تم إضافة المستخدم الجديد بنجاح.',
    deleteRoleSuccess: 'تم حذف الدور بنجاح.',
    deleteRoleConfirm: 'هل أنت متأكد من رغبتك في حذف هذا الدور المخصص؟',
    noUsers: 'لا يوجد موظفون مسجلون حالياً.',
    loading: 'جاري تحميل لوحة التحكم الأمني...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    newRoleModalTitle: 'إنشاء دور مخصص جديد',
    newRoleNameLabel: 'اسم الدور',
    newRoleDescLabel: 'الوصف الوظيفي',
    newUserModalTitle: 'إضافة مستخدم جديد للنظام',
    newUserEmailLabel: 'البريد الإلكتروني للمستخدم',
    newUserPasswordLabel: 'كلمة المرور للمستخدم',
    newUserRoleLabel: 'الدور الوظيفي والصلاحيات الممنوحة',
    modalCancel: 'إلغاء',
    modalCreate: 'إنشاء الدور الآن',
    modalAddUser: 'إضافة المستخدم الآن',
    scopeChartOfAccounts: 'دليل الحسابات الشجري',
    scopeJournalEntries: 'القيود المحاسبية اليومية',
    scopeUsers: 'إدارة الموظفين والصلاحيات',
    scopeCompanySettings: 'إعدادات المنشأة والمستأجر',
  },
  en: {
    title: 'Security & Permissions Control Panel',
    subtitle: 'Manage job roles, configure granular permission matrices, and assign duties to employees.',
    tabRoles: 'Roles & Permissions Matrix',
    tabUsers: 'Employee Role Assignment',
    addRoleBtn: 'Create New Job Role',
    roleName: 'Role Name',
    roleDesc: 'Role Description',
    isSystemRole: 'Default System Role',
    customRole: 'Custom Tenant Role',
    permissionMatrix: 'Detailed Permissions Matrix',
    scopeHeader: 'Scope / Subsystem',
    readCol: 'Read',
    createCol: 'Create',
    updateCol: 'Update',
    deleteCol: 'Delete',
    savePermissionsBtn: 'Save Permission Changes',
    adminBypassAlert: 'System Administrator permissions cannot be modified - full access granted automatically.',
    userEmail: 'Employee Email',
    assignedRole: 'Currently Assigned Role',
    changeRolePlaceholder: 'Select a role to assign...',
    assignRoleSuccess: 'Employee role successfully updated.',
    saveRoleSuccess: 'Role permissions successfully saved.',
    createRoleSuccess: 'New custom role successfully created.',
    createUserSuccess: 'New user account successfully created.',
    deleteRoleSuccess: 'Role successfully deleted.',
    deleteRoleConfirm: 'Are you sure you want to delete this custom role?',
    noUsers: 'No registered employees found.',
    loading: 'Loading security panel...',
    errorDefault: 'An unexpected error occurred.',
    newRoleModalTitle: 'Create New Custom Role',
    newRoleNameLabel: 'Role Name',
    newRoleDescLabel: 'Job Description',
    newUserModalTitle: 'Add New Tenant User',
    newUserEmailLabel: 'Employee Email Address',
    newUserPasswordLabel: 'Secure Password',
    newUserRoleLabel: 'Assign Job Role',
    modalCancel: 'Cancel',
    modalCreate: 'Create Role',
    modalAddUser: 'Create User Account',
    scopeChartOfAccounts: 'Chart of Accounts Tree',
    scopeJournalEntries: 'Double-Entry Journal Vouchers',
    scopeUsers: 'Employee Security & Permissions',
    scopeCompanySettings: 'Tenant & Company Settings',
  }
};

const scopeTranslations = {
  ChartOfAccounts: { ar: 'دليل الحسابات الشجري', en: 'Chart of Accounts Tree' },
  JournalEntries: { ar: 'القيود المحاسبية اليومية', en: 'Double-Entry Journal Vouchers' },
  Users: { ar: 'إدارة الموظفين والصلاحيات', en: 'Employee Security & Permissions' },
  CompanySettings: { ar: 'إعدادات المنشأة والمستأجر', en: 'Tenant & Company Settings' }
};

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  
  // Data State
  const [roles, setRoles] = useState<TenantRoleDto[]>([]);
  const [users, setUsers] = useState<UserWithRoleDto[]>([]);
  const [selectedRole, setSelectedRole] = useState<TenantRoleDto | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Custom Role Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Add User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRoleId, setNewUserRoleId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        axios.get<TenantRoleDto[]>('/api/security/roles'),
        axios.get<UserWithRoleDto[]>('/api/security/users')
      ]);
      
      setRoles(rolesRes.data);
      setUsers(usersRes.data);
      
      // Auto-select first role if none selected or keep previously selected by ID
      if (rolesRes.data.length > 0) {
        const previousId = selectedRole?.id;
        const current = rolesRes.data.find(r => r.id === previousId) || rolesRes.data[0];
        setSelectedRole(current);
      }
      
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update selected role permission checkbox locally
  const handleCheckboxChange = (scope: string, action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete', checked: boolean) => {
    if (!selectedRole || selectedRole.isSystem) return;

    setSelectedRole(prev => {
      if (!prev) return null;
      const updatedPermissions = prev.permissions.map(p => {
        if (p.scope === scope) {
          return { ...p, [action]: checked };
        }
        return p;
      });
      return { ...prev, permissions: updatedPermissions };
    });
  };

  // Submit dynamic permissions matrix updates
  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole.isSystem) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: selectedRole.roleName,
      description: selectedRole.description,
      permissions: selectedRole.permissions.map(p => ({
        scope: p.scope,
        canCreate: p.canCreate,
        canRead: p.canRead,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete
      }))
    };

    try {
      await axios.put(`/api/security/roles/${selectedRole.id}`, payload);
      setSuccessMsg(t.saveRoleSuccess);
      loadData();
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  // Create custom job role
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    // Initial empty CRUD permissions for all standard scopes
    const scopes = ['ChartOfAccounts', 'JournalEntries', 'Users', 'CompanySettings'];
    const initialPerms = scopes.map(s => ({
      scope: s,
      canCreate: false,
      canRead: true, // Read is enabled by default to allow basic browsing
      canUpdate: false,
      canDelete: false
    }));

    const payload = {
      name: newRoleName,
      description: newRoleDesc,
      permissions: initialPerms
    };

    try {
      const res = await axios.post<TenantRoleDto>('/api/security/roles', payload);
      setSuccessMsg(t.createRoleSuccess);
      setIsModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      
      // Refresh list and select newly created role
      await loadData();
      setSelectedRole(res.data);
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  // Create new Tenant User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserPassword.trim()) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      email: newUserEmail,
      password: newUserPassword,
      roleId: newUserRoleId === "" ? null : newUserRoleId
    };

    try {
      await axios.post('/api/security/users', payload);
      setSuccessMsg(t.createUserSuccess);
      setIsUserModalOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRoleId('');

      await loadData();
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  // Delete custom role
  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm(t.deleteRoleConfirm)) return;
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await axios.delete(`/api/security/roles/${roleId}`);
      setSuccessMsg(t.deleteRoleSuccess);
      setSelectedRole(null);
      await loadData();
      setSubmitting(false);
    } catch (err: any) {
      setSubmitting(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  // Reassign user role
  const handleUserRoleChange = async (userId: string, roleId: string) => {
    setError(null);
    setSuccessMsg(null);
    
    const payload = {
      roleId: roleId === "" ? null : roleId
    };

    try {
      await axios.put(`/api/security/users/${userId}/role`, payload);
      setSuccessMsg(t.assignRoleSuccess);
      
      // Update local state dynamically without UX stutter
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          const matchedRole = roles.find(r => r.id === roleId);
          return {
            ...u,
            roleId: roleId === "" ? null : roleId,
            roleName: matchedRole ? matchedRole.roleName : null
          };
        }
        return u;
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

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#121318] p-4 sm:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-6 animate-scale-in">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl shadow-purple-500/[0.02] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'أمان النظام والمستأجرين' : 'SaaS Security & Scope Control'}
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

        {/* Tab Selector */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 gap-1.5 p-1 bg-white dark:bg-[#1a1b22] rounded-xl border border-gray-100 dark:border-gray-800/80 shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'roles'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.tabRoles}</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow'
                : 'text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t.tabUsers}</span>
          </button>
        </div>

        {/* TAB 1: Roles & Permissions Matrix */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Roles Sidebar */}
            <div className="lg:col-span-4 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  {lang === 'ar' ? 'الأدوار المالية المتوفرة' : 'Available Business Roles'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/60 border border-purple-100 dark:border-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 text-[10px] font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    className={`w-full p-3.5 rounded-xl text-right border transition-all flex items-start justify-between group cursor-pointer ${
                      selectedRole?.id === role.id
                        ? 'bg-purple-50/50 border-purple-200 dark:bg-purple-950/10 dark:border-purple-900/50 text-purple-900 dark:text-purple-300'
                        : 'bg-transparent border-gray-100 dark:border-gray-800/30 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/20'
                    }`}
                  >
                    <div className="space-y-1 select-none pr-2 text-start">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold">{role.roleName}</span>
                        {role.isSystem ? (
                          <span className="text-[8px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 rounded-md border border-purple-200/50 dark:border-purple-800/40 font-bold">
                            {t.isSystemRole}
                          </span>
                        ) : (
                          <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-md border border-gray-200/30 dark:border-gray-700/30 font-bold">
                            {t.customRole}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed max-w-[220px]">
                          {role.description}
                        </p>
                      </div>
                    </div>

                    {!role.isSystem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions Matrix */}
            <div className="lg:col-span-8 bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-6">
              {selectedRole ? (
                <div className="space-y-6">
                  
                  {/* Selected Role Meta info */}
                  <div className="pb-4 border-b border-gray-100 dark:border-gray-800">
                    {selectedRole.isSystem ? (
                      <div>
                        <h2 className="text-base font-black text-gray-900 dark:text-gray-100">
                          {t.permissionMatrix}: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedRole.roleName}</span>
                        </h2>
                        <div className="mt-1.5 space-y-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            {selectedRole.description}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-black text-gray-900 dark:text-gray-100">
                            {t.permissionMatrix}: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{selectedRole.roleName}</span>
                          </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                              {lang === 'ar' ? 'اسم الدور الوظيفي' : 'Role Name'}
                            </label>
                            <input
                              type="text"
                              value={selectedRole.roleName}
                              onChange={(e) => setSelectedRole(prev => prev ? { ...prev, roleName: e.target.value } : null)}
                              className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 uppercase">
                              {t.roleDesc}
                            </label>
                            <input
                              type="text"
                              value={selectedRole.description}
                              onChange={(e) => setSelectedRole(prev => prev ? { ...prev, description: e.target.value } : null)}
                              className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* System role notice */}
                  {selectedRole.isSystem && (
                    <div className="flex gap-2.5 p-3.5 bg-purple-50/50 dark:bg-purple-950/10 text-purple-700 dark:text-purple-400 text-xs rounded-xl border border-purple-100/50 dark:border-purple-950/20 font-medium">
                      <Info className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                      <span>{t.adminBypassAlert}</span>
                    </div>
                  )}

                  {/* Matrix Table */}
                  <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 px-4 py-3 grid grid-cols-12 gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <div className="col-span-12 sm:col-span-4">{t.scopeHeader}</div>
                      <div className="col-span-3 sm:col-span-2 text-center">{t.readCol}</div>
                      <div className="col-span-3 sm:col-span-2 text-center">{t.createCol}</div>
                      <div className="col-span-3 sm:col-span-2 text-center">{t.updateCol}</div>
                      <div className="col-span-3 sm:col-span-2 text-center">{t.deleteCol}</div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-800/30 px-4 py-2">
                      {selectedRole.permissions.map(perm => {
                        const scopeText = scopeTranslations[perm.scope as keyof typeof scopeTranslations]?.[lang] || perm.scope;
                        return (
                          <div key={perm.scope} className="grid grid-cols-12 gap-3 py-3.5 items-center">
                            
                            {/* Scope title */}
                            <div className="col-span-12 sm:col-span-4 text-xs font-bold text-gray-700 dark:text-gray-300">
                              {scopeText}
                            </div>

                            {/* View Checkbox */}
                            <div className="col-span-3 sm:col-span-2 text-center">
                              <input
                                type="checkbox"
                                disabled={selectedRole.isSystem}
                                checked={perm.canRead}
                                onChange={(e) => handleCheckboxChange(perm.scope, 'canRead', e.target.checked)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-[#121318] dark:border-gray-800 cursor-pointer disabled:opacity-50"
                              />
                            </div>

                            {/* Create Checkbox */}
                            <div className="col-span-3 sm:col-span-2 text-center">
                              <input
                                type="checkbox"
                                disabled={selectedRole.isSystem}
                                checked={perm.canCreate}
                                onChange={(e) => handleCheckboxChange(perm.scope, 'canCreate', e.target.checked)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-[#121318] dark:border-gray-800 cursor-pointer disabled:opacity-50"
                              />
                            </div>

                            {/* Update Checkbox */}
                            <div className="col-span-3 sm:col-span-2 text-center">
                              <input
                                type="checkbox"
                                disabled={selectedRole.isSystem}
                                checked={perm.canUpdate}
                                onChange={(e) => handleCheckboxChange(perm.scope, 'canUpdate', e.target.checked)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-[#121318] dark:border-gray-800 cursor-pointer disabled:opacity-50"
                              />
                            </div>

                            {/* Delete Checkbox */}
                            <div className="col-span-3 sm:col-span-2 text-center">
                              <input
                                type="checkbox"
                                disabled={selectedRole.isSystem}
                                checked={perm.canDelete}
                                onChange={(e) => handleCheckboxChange(perm.scope, 'canDelete', e.target.checked)}
                                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 dark:bg-[#121318] dark:border-gray-800 cursor-pointer disabled:opacity-50"
                              />
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button for custom roles */}
                  {!selectedRole.isSystem && (
                    <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800/80">
                      <button
                        onClick={handleSavePermissions}
                        disabled={submitting}
                        className="py-2 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>{t.savePermissionsBtn}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

          </div>
        )}

        {/* TAB 2: Employee Role Assignment */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl space-y-6">
            
            {/* Header with User Creation Button */}
            <div className="flex items-center justify-between gap-4 border-b border-gray-50 dark:border-gray-800/60 pb-4">
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-500" />
                <span>{t.tabUsers}</span>
              </h3>
              
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
              </button>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
                <p className="text-xs">{t.noUsers}</p>
              </div>
            ) : (
              <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-right border-collapse text-xs sm:text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                      <th className="px-6 py-3.5">{t.userEmail}</th>
                      <th className="px-6 py-3.5">{t.assignedRole}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all">
                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {user.email.substring(0, 2)}
                          </div>
                          <span>{user.email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={user.roleId || ''}
                            onChange={(e) => handleUserRoleChange(user.id, e.target.value)}
                            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all cursor-pointer font-bold max-w-[200px]"
                          >
                            <option value="">{t.changeRolePlaceholder}</option>
                            {roles.map(role => (
                              <option key={role.id} value={role.id}>
                                {role.roleName} {role.isSystem ? `(${lang === 'ar' ? 'افتراضي' : 'Default'})` : ''}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MODAL: Create New Custom Role */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-purple-500" />
                <span>{t.newRoleModalTitle}</span>
              </h3>

              <form onSubmit={handleCreateRole} className="space-y-4">
                {/* Role Name */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.newRoleNameLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g. Data Entry, Accountant Manager"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.newRoleDescLabel} <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    rows={3}
                    placeholder="الوصف التفصيلي لمهام الدور المحاسبي الجديد..."
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold resize-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.modalCancel}
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
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t.modalCreate}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add New Tenant User */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-500" />
                <span>{t.newUserModalTitle}</span>
              </h3>

              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* User Email */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.newUserEmailLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. employee@company.com"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.newUserPasswordLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                {/* User Role */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.newUserRoleLabel}
                  </label>
                  <select
                    value={newUserRoleId}
                    onChange={(e) => setNewUserRoleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold cursor-pointer"
                  >
                    <option value="">{t.changeRolePlaceholder}</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.roleName} {role.isSystem ? `(${lang === 'ar' ? 'افتراضي' : 'Default'})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {t.modalCancel}
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
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{t.modalAddUser}</span>
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
