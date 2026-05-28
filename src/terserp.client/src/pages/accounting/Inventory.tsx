import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Save, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle,
  AlertCircle,
  PackagePlus,
  Boxes
} from 'lucide-react';

interface InventoryProps {
  lang: 'ar' | 'en';
}

interface ProductDto {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  salesPrice: number;
  stockQuantity: number;
}

const translations = {
  ar: {
    title: 'المستودعات والمنتجات',
    subtitle: 'إدارة مخزون السلع والمنتجات، تتبع مستويات التوفر، وتقييم المخازن الفوري.',
    addBtn: 'تعريف منتج جديد',
    skuCol: 'رمز السلعة SKU',
    nameCol: 'اسم المنتج',
    barcodeCol: 'الباركود',
    costCol: 'سعر التكلفة',
    priceCol: 'سعر البيع',
    qtyCol: 'الكمية المتوفرة',
    valueCol: 'قيمة المخزون',
    actionsCol: 'العمليات',
    noProducts: 'لا يوجد منتجات معرفة بالمستودع حالياً.',
    loading: 'جاري تحميل جرد المخازن...',
    errorDefault: 'حدث خطأ غير متوقع أثناء معالجة البيانات.',
    successAdd: 'تم إضافة المنتج بنجاح.',
    successUpdate: 'تم تحديث المنتج بنجاح.',
    successDelete: 'تم حذف المنتج بنجاح.',
    deleteConfirm: 'هل أنت متأكد من رغبتك في حذف هذا المنتج؟',
    modalTitleAdd: 'تعريف منتج مستودعي جديد',
    modalTitleEdit: 'تعديل بيانات المنتج',
    labelName: 'اسم المنتج / الخدمة',
    labelSku: 'رمز المنتج (SKU)',
    labelBarcode: 'رمز الباركود (Barcode)',
    labelCost: 'تكلفة الشراء (بدون ضريبة)',
    labelPrice: 'سعر البيع الافتراضي',
    labelQty: 'الكمية الافتتاحية للمخزن',
    btnCancel: 'إلغاء',
    btnSave: 'حفظ المنتج',
    metricSkus: 'إجمالي الأصناف SKU',
    metricUnits: 'إجمالي السلع والقطع',
    metricValuation: 'تقييم المخزون بالتكلفة',
    metricWarning: 'أصناف قاربت على النفاد',
    warningText: 'كمية منخفضة!'
  },
  en: {
    title: 'Products & Inventory',
    subtitle: 'Manage items catalog, track stock quantity levels, and view real-time valuation.',
    addBtn: 'Create New Product',
    skuCol: 'Product SKU',
    nameCol: 'Product Name',
    barcodeCol: 'Barcode',
    costCol: 'Cost Price',
    priceCol: 'Selling Price',
    qtyCol: 'Stock Quantity',
    valueCol: 'Stock Value',
    actionsCol: 'Actions',
    noProducts: 'No products in stock yet.',
    loading: 'Loading stock inventory...',
    errorDefault: 'An unexpected error occurred.',
    successAdd: 'Product created successfully.',
    successUpdate: 'Product updated successfully.',
    successDelete: 'Product deleted successfully.',
    deleteConfirm: 'Are you sure you want to delete this product?',
    modalTitleAdd: 'Create New Inventory Product',
    modalTitleEdit: 'Edit Product Details',
    labelName: 'Product Name / Service',
    labelSku: 'Product Code (SKU)',
    labelBarcode: 'Barcode Reference',
    labelCost: 'Purchase Unit Cost',
    labelPrice: 'Default Selling Price',
    labelQty: 'Opening Stock Quantity',
    btnCancel: 'Cancel',
    btnSave: 'Save Product',
    metricSkus: 'Total Active SKUs',
    metricUnits: 'Total Units in Stock',
    metricValuation: 'Stock Valuation (Cost)',
    metricWarning: 'Low Stock Warnings',
    warningText: 'Low Stock!'
  }
};

export const Inventory: React.FC<InventoryProps> = ({ lang }) => {
  const t = translations[lang];
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [productBarcode, setProductBarcode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salesPrice, setSalesPrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<ProductDto[]>('/api/products');
      setProducts(res.data);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || t.errorDefault);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setSelectedProductId(null);
    setProductName('');
    setProductSku('');
    setProductBarcode('');
    setPurchasePrice(0);
    setSalesPrice(0);
    setStockQuantity(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: ProductDto) => {
    setModalMode('edit');
    setSelectedProductId(product.id);
    setProductName(product.name);
    setProductSku(product.sku);
    setProductBarcode(product.barcode);
    setPurchasePrice(product.purchasePrice);
    setSalesPrice(product.salesPrice);
    setStockQuantity(product.stockQuantity);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !productSku.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      name: productName,
      sku: productSku,
      barcode: productBarcode,
      purchasePrice: Number(purchasePrice),
      salesPrice: Number(salesPrice),
      stockQuantity: Number(stockQuantity)
    };

    try {
      if (modalMode === 'add') {
        await axios.post('/api/products', payload);
        setSuccessMsg(t.successAdd);
      } else {
        await axios.put(`/api/products/${selectedProductId}`, payload);
        setSuccessMsg(t.successUpdate);
      }

      setIsModalOpen(false);
      await loadProducts();
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
      await axios.delete(`/api/products/${id}`);
      setSuccessMsg(t.successDelete);
      await loadProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t.errorDefault);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics calculators
  const totalSkus = products.length;
  const totalUnits = products.reduce((sum, p) => sum + p.stockQuantity, 0);
  const totalValuation = products.reduce((sum, p) => sum + (p.purchasePrice * p.stockQuantity), 0);
  const lowStockCount = products.filter(p => p.stockQuantity <= 5).length;

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
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full border border-purple-100 dark:border-purple-900/30">
                {lang === 'ar' ? 'المنتجات واللوجستيات' : 'Inventory & Products SKU'}
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
              onClick={loadProducts}
              className="p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-950/30 border border-gray-200 dark:border-gray-800 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total SKUs */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.metricSkus}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalSkus}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Total Units */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.metricUnits}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalUnits.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Valuation */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.metricValuation}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white mt-1.5">
                {totalValuation.toLocaleString()} {lang === 'ar' ? 'ريال' : 'SAR'}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Warnings */}
          <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{t.metricWarning}</p>
              <p className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? 'text-amber-500 animate-pulse' : 'text-gray-950 dark:text-white'}`}>
                {lowStockCount}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
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

        {/* Inventory Table */}
        <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 p-6 rounded-2xl shadow-xl">
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Boxes className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3 animate-pulse" />
              <p className="text-xs">{t.noProducts}</p>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-right border-collapse text-xs sm:text-sm" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-800 font-bold text-gray-500 dark:text-gray-400">
                    <th className="px-6 py-3.5">{t.skuCol}</th>
                    <th className="px-6 py-3.5">{t.nameCol}</th>
                    <th className="px-6 py-3.5">{t.costCol}</th>
                    <th className="px-6 py-3.5">{t.priceCol}</th>
                    <th className="px-6 py-3.5">{t.qtyCol}</th>
                    <th className="px-6 py-3.5">{t.valueCol}</th>
                    <th className="px-6 py-3.5 text-center">{t.actionsCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/30 text-gray-700 dark:text-gray-300 font-medium">
                  {products.map(product => {
                    const lowStock = product.stockQuantity <= 5;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50/20 dark:hover:bg-gray-800/10 transition-all">
                        <td className="px-6 py-4 font-bold text-purple-650 dark:text-purple-400">{product.sku}</td>
                        <td className="px-6 py-4 font-bold">{product.name}</td>
                        <td className="px-6 py-4 text-gray-550 dark:text-gray-400">{product.purchasePrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-550 dark:text-gray-400">{product.salesPrice.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black ${lowStock ? 'text-amber-500 font-extrabold' : ''}`}>
                              {product.stockQuantity.toLocaleString()}
                            </span>
                            {lowStock && (
                              <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded border border-amber-100 dark:border-amber-900/30 select-none animate-pulse">
                                {t.warningText}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-gray-950 dark:text-white">
                          {(product.purchasePrice * product.stockQuantity).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: Add / Edit Product */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1a1b22] border border-gray-100 dark:border-gray-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden animate-scale-in">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
              
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
                <PackagePlus className="w-5 h-5 text-purple-500" />
                <span>{modalMode === 'add' ? t.modalTitleAdd : t.modalTitleEdit}</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelSku} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      placeholder="e.g. LAP-001"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelBarcode}
                    </label>
                    <input
                      type="text"
                      value={productBarcode}
                      onChange={(e) => setProductBarcode(e.target.value)}
                      placeholder="Barcode number"
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                    {t.labelName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. شاشة كمبيوتر بدقة عالية / IPS Monitor 24"
                    className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelCost}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelPrice}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salesPrice}
                      onChange={(e) => setSalesPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 dark:bg-[#121318] dark:border-gray-800 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 mb-1 tracking-wider uppercase">
                      {t.labelQty}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(Number(e.target.value))}
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
