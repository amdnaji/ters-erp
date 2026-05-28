import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, FileText, Plus, Minus, Layers, RotateCcw } from 'lucide-react';

export interface AccountNodeDto {
  id: string;
  code: string;
  name: string;
  type: number; // 1: Assets, 2: Liabilities, 3: Equity, 4: Revenue, 5: Expenses
  parentId: string | null;
  isGroup: boolean;
  balance: number;
  children: AccountNodeDto[];
}

interface AccountTreeProps {
  data: AccountNodeDto[];
  onAddSubAccount: (parentId: string, parentName: string, parentCode: string, accountType: number) => void;
  searchTerm: string;
  globalExpanded: boolean | null; // null represents manual toggles
  lang: 'ar' | 'en';
  canCreate: boolean;
}

const ACCOUNT_TYPES = [
  { value: 1, labelAr: 'أصول', labelEn: 'Assets', style: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40' },
  { value: 2, labelAr: 'التزامات', labelEn: 'Liabilities', style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/40' },
  { value: 3, labelAr: 'حقوق ملكية', labelEn: 'Equity', style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-100 dark:border-blue-900/40' },
  { value: 4, labelAr: 'إيرادات', labelEn: 'Revenue', style: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/40' },
  { value: 5, labelAr: 'مصروفات', labelEn: 'Expenses', style: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/40' },
];

export const AccountTree: React.FC<AccountTreeProps> = ({
  data,
  onAddSubAccount,
  searchTerm,
  globalExpanded,
  lang,
  canCreate,
}) => {
  // Store expanded state of individual nodes
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Reset/sync expanded nodes when globalExpanded trigger changes
  useEffect(() => {
    if (globalExpanded !== null) {
      const newExpanded: Record<string, boolean> = {};
      const setAll = (nodes: AccountNodeDto[]) => {
        nodes.forEach(node => {
          if (node.isGroup) {
            newExpanded[node.id] = globalExpanded;
            if (node.children) setAll(node.children);
          }
        });
      };
      setAll(data);
      setExpandedNodes(newExpanded);
    }
  }, [globalExpanded, data]);

  // Helper to check if a node matches search or has children that match
  const matchesSearch = (node: AccountNodeDto, term: string): boolean => {
    if (!term) return true;
    const cleanTerm = term.toLowerCase().trim();
    const selfMatch = 
      node.code.includes(cleanTerm) ||
      node.name.toLowerCase().includes(cleanTerm);
    
    if (selfMatch) return true;

    return node.children?.some(child => matchesSearch(child, term)) || false;
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatBalance = (val: number) => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'SAR' }).format(val);
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: AccountNodeDto, depth: number = 0) => {
    if (searchTerm && !matchesSearch(node, searchTerm)) {
      return null;
    }

    // Default expanded to true if searching, otherwise use state
    const isNodeExpanded = searchTerm ? true : (expandedNodes[node.id] ?? false);
    const hasChildren = node.children && node.children.length > 0;
    const typeInfo = ACCOUNT_TYPES.find(t => t.value === node.type) || ACCOUNT_TYPES[0];

    return (
      <div key={node.id} className="w-full">
        {/* Account Row */}
        <div 
          className={`flex items-center justify-between py-2.5 px-4 border-b border-gray-100 dark:border-gray-800/60 hover:bg-purple-50/20 dark:hover:bg-purple-950/10 transition-all rounded-xl my-0.5 group ${
            node.isGroup ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'
          }`}
          style={{ paddingRight: `${Math.max(16, depth * 28)}px` }}
        >
          {/* Right Side: Indent lines + expand toggle + icon + Code + Name */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Expand +/- Toggle */}
            {node.isGroup ? (
              <button 
                onClick={() => toggleNode(node.id)}
                type="button" 
                className="w-5 h-5 flex items-center justify-center border border-gray-200 dark:border-gray-700/80 rounded text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex-shrink-0 cursor-pointer"
              >
                {isNodeExpanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
            ) : (
              <div className="w-5 h-5 flex-shrink-0"></div> /* Placeholder spacing for leaf accounts */
            )}

            {/* Account Icon (Folder for Groups, File/Document for Ledgers) */}
            <div className="flex-shrink-0">
              {node.isGroup ? (
                isNodeExpanded ? (
                  <FolderOpen className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                ) : (
                  <Folder className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                )
              ) : (
                <FileText className="w-4.5 h-4.5 text-gray-400 dark:text-gray-500" />
              )}
            </div>

            {/* Account Code */}
            <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 text-gray-500 rounded border border-gray-200/40 dark:border-gray-700/40">
              {node.code}
            </span>

            {/* Account Name */}
            <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2.5 truncate ${lang === 'ar' ? 'ml-2' : 'mr-2'}`}>
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{node.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Account Type Badge */}
            <span className={`text-[10px] sm:text-xs font-medium py-1 px-2.5 rounded-full border ${typeInfo.style}`}>
              {lang === 'ar' ? typeInfo.labelAr : typeInfo.labelEn}
            </span>

            {/* Balance */}
            <span className={`text-xs font-mono font-bold ${node.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
              {formatBalance(node.balance)}
            </span>

            {/* Add Sub-account Button (Only visible/active on group accounts) */}
            {node.isGroup && canCreate ? (
              <button
                onClick={() => onAddSubAccount(node.id, node.name, node.code, node.type)}
                title={lang === 'ar' ? "إضافة حساب فرعي" : "Add sub-account"}
                type="button"
                className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-950/40 rounded-xl transition-all shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-7 h-7"></div> /* Empty placeholder for leaf accounts action space */
            )}
          </div>
        </div>

        {/* Nested Child Nodes */}
        {hasChildren && isNodeExpanded && (
          <div className="relative">
            {/* Indentation Depth visual guideline */}
            <div 
              className="absolute top-0 bottom-0 border-l border-dashed border-gray-200 dark:border-gray-800" 
              style={{ right: `${Math.max(28, (depth + 1) * 28 - 14)}px` }}
            ></div>
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl shadow-xl overflow-hidden">
      {/* Table-like Header */}
      <div className="flex items-center justify-between py-3 px-6 bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800 text-xs font-bold text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-purple-500" />
          <span>{lang === 'ar' ? 'اسم وتصنيف الحساب' : 'Account Name & Type'}</span>
        </div>
        <div className={`flex items-center gap-12 ${lang === 'ar' ? 'pr-6' : 'pl-6'}`}>
          <span>{lang === 'ar' ? 'التصنيف' : 'Type'}</span>
          <span>{lang === 'ar' ? 'الرصيد الحالي' : 'Current Balance'}</span>
          <span className="w-7"></span> {/* Action placeholder spacing */}
        </div>
      </div>

      {/* Tree content */}
      <div className="p-4 divide-y divide-gray-50 dark:divide-gray-800/30 overflow-y-auto max-h-[650px]">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-700 animate-pulse mb-3" />
            <p className="text-sm font-semibold">{lang === 'ar' ? 'لا يوجد حسابات متوفرة' : 'No accounts available'}</p>
            <p className="text-xs text-gray-500 mt-1">{lang === 'ar' ? 'يُرجى إنشاء حساب جديد أو استيراد الشجرة الافتراضية للبدء.' : 'Please create a new account or import the default tree to start.'}</p>
          </div>
        ) : (
          data.map(rootNode => renderTreeNode(rootNode, 0))
        )}
      </div>
    </div>
  );
};
