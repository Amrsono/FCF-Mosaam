import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Plus, UserCheck, RefreshCw, FileUp, CreditCard, Gift, AlertCircle, Flag, PackageX, 
  RotateCcw, Check, Pencil, X, Trash2, ChevronLeft, ChevronRight, QrCode, Camera, XCircle 
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';
import { JUMIA_CATEGORIES } from '../utils/jumiaCategories';

const normalizeOutlet = (val) => {
  if (!val) return 'eltalg';
  const v = String(val).toLowerCase().trim();
  if (v === 'eltalg' || v.includes('banha 1') || v.includes('banha1') || v.includes('ثلج') || v.includes('تلج')) return 'eltalg';
  if (v === 'tegara' || v.includes('banha 2') || v.includes('banha2') || v.includes('تجارة') || v.includes('تجاره')) return 'tegara';
  if (v === 'mostashfa' || v.includes('banha 3') || v.includes('banha3') || v.includes('مستشفى') || v.includes('مستشفي')) return 'mostashfa';
  return val;
};

const normalizePhone = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '').replace(/^0+/, ''); 
  return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
};

export default function OrdersTab() {
  const { 
    orders, 
    customers, 
    receiveOrder, 
    calculatePenalty, 
    calculateStorageFee, 
    markOrderPickedUp, 
    returnOrder, 
    updateCustomer, 
    customerReturns, 
    receiveCustomerReturn, 
    markReturnedToJumia,
    revertCustomerReturn,
    updateCustomerReturn,
    deleteCustomerReturn,
    validateDiscount,
    updateOrder,
    cancelOrder,
    deleteOrder,
    revertOrderToInventory,
    globalFilters,
    updateFilters
  } = useDashboard();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const f = globalFilters.orders;
  const searchTerm = f.searchTerm;
  const filterCategory = f.category;
  const filterSize = f.size;
  const filterStatus = f.status;
  const filterOutlet = user?.role === 'admin' ? f.outlet : normalizeOutlet(user?.outlet || 'eltalg');
  const filterDateStart = f.dateStart;
  const filterDateEnd = f.dateEnd;
  const filterPaymentMethod = f.paymentMethod;

  const setSearchTerm = (val) => updateFilters('orders', { searchTerm: val });
  const setFilterCategory = (val) => updateFilters('orders', { category: val });
  const setFilterSize = (val) => updateFilters('orders', { size: val });
  const setFilterStatus = (val) => updateFilters('orders', { status: val });
  const setFilterOutlet = (val) => updateFilters('orders', { outlet: val });
  const setFilterDateStart = (val) => updateFilters('orders', { dateStart: val });
  const setFilterDateEnd = (val) => updateFilters('orders', { dateEnd: val });
  const setFilterPaymentMethod = (val) => updateFilters('orders', { paymentMethod: val });

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [customerUpdateData, setCustomerUpdateData] = useState({ name: '', email: '', address: '', phone: '' });

  // Cancel/Delete state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [targetOrder, setTargetOrder] = useState(null);
  const [originalOrderId, setOriginalOrderId] = useState(null);
  const [pendingOrderId, setPendingOrderId] = useState(null);

  // Customer Returns state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFilterStatus, setReturnFilterStatus] = useState('At Station');
  const [newReturn, setNewReturn] = useState({
    orderId: '',
    customerPhone: '',
    customerName: '',
    description: '',
    reason: '',
    outlet: user?.outlet || 'eltalg'
  });
  const [editingReturn, setEditingReturn] = useState(null);
  const [showDeleteReturnModal, setShowDeleteReturnModal] = useState(false);
  const [targetReturn, setTargetReturn] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: 'receivedAt', direction: 'desc' });

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '',
    customerPhone: '',
    description: '',
    totalValue: '',
    category: JUMIA_CATEGORIES[0].en,
    subcategory: JUMIA_CATEGORIES[0].subcategories[0].en,
    customerName: '',
    outlet: user?.outlet || 'eltalg',
    size: '',
    paymentMethod: 'Cash',
    discountCode: '',
    discountAmount: 0
  });

  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const handlePhoneChange = (val) => {
    setNewOrder(prev => ({ ...prev, customerPhone: val }));
    if (!val.trim()) {
      setPhoneSuggestions([]);
      return;
    }
    const cleanVal = val.toLowerCase();
    const matches = customers.filter(c => 
      c.phone.includes(cleanVal) || 
      c.name.toLowerCase().includes(cleanVal)
    ).slice(0, 5);
    setPhoneSuggestions(matches);
  };

  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('description'), accessor: 'description' },
    { label: t('category'), accessor: 'category' },
    { label: t('value'), accessor: 'totalValue' },
    { label: language === 'ar' ? 'رسوم التخزين' : 'Storage Fees', accessor: 'penalty' },
    { label: language === 'ar' ? 'المنفذ' : 'Outlet', accessor: 'outlet' },
    { label: language === 'ar' ? 'المقاس' : 'Size', accessor: 'size' },
    { label: t('paymentMethod'), accessor: 'paymentMethod' },
    { label: language === 'ar' ? 'مبلغ كاش' : 'Cash Amount', accessor: o => o.status === 'Picked Up' && (!o.paymentMethod || ['cash', 'visa', 'creditcard'].includes(String(o.paymentMethod).toLowerCase().replace(/\s/g, ''))) ? (Number(o.totalValue) - (o.discountAmount || 0)) : 0 },
    { label: language === 'ar' ? 'مبلغ جوميا باي' : 'JumiaPay Amount', accessor: o => o.status === 'Picked Up' && o.paymentMethod && String(o.paymentMethod).toLowerCase().replace(/\s/g, '') === 'jumiapay' ? (Number(o.totalValue) - (o.discountAmount || 0)) : 0 },
    { label: t('status'), accessor: 'status' },
    { label: t('pickedFromJumia'), accessor: o => new Date(o.receivedAt).toLocaleString() },
    { label: t('pickedUpByCustomer'), accessor: o => o.pickedUpAt ? new Date(o.pickedUpAt).toLocaleString() : '-' },
    { label: t('daysInInv'), accessor: 'daysParked' }
  ];

  const getOutletLabel = (val) => {
    if (val === 'eltalg') return t('eltalg');
    if (val === 'tegara') return t('tegara');
    if (val === 'mostashfa') return t('mostashfa');
    return val;
  };


  const parseEgyptDate = (str, setToEnd) => {
    if (!str) return null;
    const [y, m, day] = str.split('-').map(Number);
    const date = new Date(y, m - 1, day);
    if (setToEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const isInRange = (dateStr, start, end) => {
    if (!start && !end) return true;
    if (!dateStr) return false;
    
    const d = new Date(dateStr);
    const sLimit = start ? parseEgyptDate(start, false) : null;
    const eLimit = end ? parseEgyptDate(end, true) : null;
    
    return (!sLimit || d >= sLimit) && (!eLimit || d <= eLimit);
  };

  const customerMap = useMemo(() => {
    const map = new Map();
    customers.forEach(c => map.set(c.phone, c));
    return map;
  }, [customers]);

  const allFilteredOrders = useMemo(() => {
    return orders.map(order => {
      const cust = customerMap.get(order.customerPhone);
      return {
        ...order,
        customerName: cust?.name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
        tier: cust?.tier || (language === 'ar' ? 'جديد' : 'New'),
        penalty: calculatePenalty(order),
        daysParked: order.status === 'Inventory' ? getDaysDifference(order.receivedAt) : 0
      };
    }).filter(order => {
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            order.customerPhone.includes(searchTerm);
      const matchesCategory = filterCategory === 'All' || order.category === filterCategory;
      const matchesSize = filterSize === 'All' || order.size === filterSize;
      const matchesOutlet = filterOutlet === 'All' || normalizeOutlet(order.outlet) === filterOutlet;
      const matchesPayment = filterPaymentMethod === 'All' || order.paymentMethod === filterPaymentMethod;
      
      return matchesSearch && matchesCategory && matchesSize && matchesOutlet && matchesPayment;
    });
  }, [orders, customerMap, searchTerm, filterCategory, filterSize, filterOutlet, filterPaymentMethod, calculatePenalty, language]);

  // Display filtering logic (including status and status-specific date logic)
  const orderList = useMemo(() => {
    return allFilteredOrders
      .filter(order => {
        if (!filterDateStart && !filterDateEnd) return true;
        
        if (filterStatus === 'Inventory') {
          // For Inventory, show everything currently in stock, 
          // but respect the end date as an upper bound of when it was received.
          const eLimit = parseEgyptDate(filterDateEnd, true);
          return !eLimit || new Date(order.receivedAt) <= eLimit;
        } else if (filterStatus === 'Picked Up') {
          return isInRange(order.pickedUpAt, filterDateStart, filterDateEnd);
        } else if (filterStatus === 'Returned' || filterStatus === 'Cancelled') {
          return isInRange(order.returnedAt, filterDateStart, filterDateEnd);
        } else {
          // Status === 'All'
          return isInRange(order.receivedAt, filterDateStart, filterDateEnd) || 
                 isInRange(order.pickedUpAt, filterDateStart, filterDateEnd) || 
                 isInRange(order.returnedAt, filterDateStart, filterDateEnd);
        }
      })
      .filter(order => filterStatus === 'All' || order.status === filterStatus)
      .sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'customer') {
          aVal = String(a.customerName || '').toLowerCase();
          bVal = String(b.customerName || '').toLowerCase();
        } else if (sortConfig.key === 'receivedAt' || sortConfig.key === 'pickedUpAt') {
          aVal = new Date(aVal || 0).getTime();
          bVal = new Date(bVal || 0).getTime();
        } else if (sortConfig.key === 'daysParked' || sortConfig.key === 'totalValue') {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [allFilteredOrders, filterStatus, filterDateStart, filterDateEnd, sortConfig]);

  const handleSort = (key) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        if (key !== 'receivedAt') {
          setSortConfig({ key: 'receivedAt', direction: 'desc' });
        } else {
          setSortConfig({ key, direction: 'asc' });
        }
      }
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };
  
  // Calculate Pagination
  const totalPages = Math.ceil(orderList.length / itemsPerPage);

  useEffect(() => {
    let html5QrCode;
    if (isScanning && scannerRef.current) {
      html5QrCode = new Html5Qrcode("qr-reader");
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success
          try {
            const data = JSON.parse(decodedText);
            setNewOrder(prev => ({
              ...prev,
              id: data.id || prev.id,
              customerPhone: data.customerPhone || data.phone || prev.customerPhone,
              customerName: data.customerName || data.name || prev.customerName,
              description: data.description || prev.description,
              totalValue: data.totalValue || data.value || prev.totalValue,
              category: data.category || prev.category,
              size: data.size || prev.size
            }));
          } catch (e) {
            // Not JSON, assume it's just the ID
            setNewOrder(prev => ({ ...prev, id: decodedText }));
          }
          setIsScanning(false);
          html5QrCode.stop();
        },
        (errorMessage) => {
          // parse error, ignore
        }
      ).catch(err => {
        console.error("Scanner error:", err);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(e => console.error(e));
      }
    };
  }, [isScanning, scannerRef]);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return orderList.slice(startIndex, startIndex + itemsPerPage);
  }, [orderList, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterSize, filterStatus, filterOutlet, filterDateStart, filterDateEnd, filterPaymentMethod, itemsPerPage]);

  // Summary by Outlet (calculated from already filtered data)
  const summaryByOutlet = useMemo(() => {
    const outletsInList = [...new Set(allFilteredOrders.map(o => normalizeOutlet(o.outlet)))].filter(Boolean);
    const mainOutlets = ['eltalg', 'tegara', 'mostashfa'];
    let displayOutlets = [...mainOutlets];
    
    if (filterOutlet !== 'All') {
      displayOutlets = [filterOutlet];
    } else {
      const otherOutlets = outletsInList.filter(o => !mainOutlets.includes(o));
      displayOutlets = [...mainOutlets, ...otherOutlets];
    }
    
    return displayOutlets.map(outletName => {
      const outletOrders = allFilteredOrders.filter(o => normalizeOutlet(o.outlet) === outletName);
      
      // Activity-based counts
      const receivedInRange = outletOrders.filter(o => isInRange(o.receivedAt, filterDateStart, filterDateEnd));
      const pickedUpInRange = outletOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt, filterDateStart, filterDateEnd));
      
      const stdReturnedInRange = outletOrders.filter(o => o.status === 'Returned' && isInRange(o.returnedAt, filterDateStart, filterDateEnd));
      const custReturnedInRange = (customerReturns || []).filter(r => 
        r.status === 'Returned to Jumia' && 
        isInRange(r.returnedAt, filterDateStart, filterDateEnd) && 
        normalizeOutlet(r.outlet) === outletName
      );
      const returnedInRange = [...stdReturnedInRange, ...custReturnedInRange];
      
      const cancelledInRange = outletOrders.filter(o => o.status === 'Cancelled' && isInRange(o.returnedAt, filterDateStart, filterDateEnd));
      
      // Current Inventory: items that are in 'Inventory' status and were received on or before the end date
      const eLimit = parseEgyptDate(filterDateEnd, true);
      const inventoryCurrent = outletOrders.filter(o => o.status === 'Inventory' && (!eLimit || new Date(o.receivedAt) <= eLimit));

      const received = receivedInRange.length;
      const pickedUp = pickedUpInRange.length;
      const returned = returnedInRange.length;
      const cancelled = cancelledInRange.length;
      const available = inventoryCurrent.length;
      
      // Total money collected in period (from pick ups)
      const totalMoney = pickedUpInRange.reduce((sum, o) => sum + ((o.totalValue || 0) - (o.discountAmount || 0)), 0);
      const paid = totalMoney; 
      
      const pickedUpWithCash = pickedUpInRange.filter(o => !o.paymentMethod || ['cash', 'visa', 'creditcard'].includes(String(o.paymentMethod).toLowerCase().replace(/\s/g, '')));
      const pickedUpWithJumiaPay = pickedUpInRange.filter(o => o.paymentMethod && String(o.paymentMethod).toLowerCase().replace(/\s/g, '') === 'jumiapay');

      const cashQty = pickedUpWithCash.length;
      const cashAmount = pickedUpWithCash.reduce((sum, o) => sum + ((Number(o.totalValue) || 0) - (o.discountAmount || 0)), 0);
      
      const jumiaPayQty = pickedUpWithJumiaPay.length;
      const jumiaPayAmount = pickedUpWithJumiaPay.reduce((sum, o) => sum + ((Number(o.totalValue) || 0) - (o.discountAmount || 0)), 0);

      const sCount = inventoryCurrent.filter(o => o.size === 'S').length;
      const mCount = inventoryCurrent.filter(o => o.size === 'M').length;
      const lCount = inventoryCurrent.filter(o => o.size === 'L').length;

      const storageFees = inventoryCurrent.reduce((sum, o) => sum + (o.penalty || 0), 0);

      return {
        outlet: outletName,
        received,
        pickedUp,
        returned,
        cancelled,
        available,
        totalMoney,
        paid,
        cashQty,
        cashAmount,
        jumiaPayQty,
        jumiaPayAmount,
        storageFees,
        sCount,
        mCount,
        lCount
      };
    });
  }, [allFilteredOrders, filterOutlet, filterDateStart, filterDateEnd]);

  const handleSimulateReceive = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone || !newOrder.customerName || !newOrder.description || !newOrder.totalValue || !newOrder.size) {
      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    
    receiveOrder({
      id: newOrder.id,
      customerPhone: newOrder.customerPhone,
      customerName: newOrder.customerName,
      description: newOrder.description,
      totalValue: Number(newOrder.totalValue),
      category: newOrder.category,
      subcategory: newOrder.subcategory,
      outlet: newOrder.outlet,
      size: newOrder.size,
      paymentMethod: newOrder.paymentMethod,
      discountCode: newOrder.discountCode,
      discountAmount: Number(newOrder.discountAmount)
    });
    setShowSimulateModal(false);
    setPhoneSuggestions([]);
    setNewOrder({ 
      id: '', customerPhone: '', description: '', totalValue: '', 
      category: JUMIA_CATEGORIES[0].en, 
      subcategory: JUMIA_CATEGORIES[0].subcategories[0].en,
      customerName: '',
      outlet: user?.outlet || 'eltalg', size: '', paymentMethod: 'Cash', discountCode: '', discountAmount: 0
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Inventory': return t('pickedFromJumia');
      case 'Picked Up': return t('pickedUpByCustomer');
      case 'Returned': return t('returnedStatus');
      case 'Cancelled': return language === 'ar' ? 'ملغي' : 'Cancelled';
      default: return status;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>
      
      {/* ═══════════════════ Main Inventory Section ═══════════════════ */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Search & Filters */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '250px', flex: '1 1 200px' }}>
               <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '10px', top: '10px', color: 'var(--text-muted)' }} />
               <input 
                 type="text" 
                 className="input-field" 
                 placeholder={t('search')} 
                 style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.5rem', width: '100%' }}
                 value={searchTerm}
                 onChange={e => setSearchTerm(e.target.value)}
               />
            </div>
            
            <select className="input-field" style={{ flex: '1 1 140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Inventory">{t('pickedFromJumia')}</option>
              <option value="Picked Up">{t('pickedUpByCustomer')}</option>
              <option value="Cancelled">{language === 'ar' ? 'طلبات ملغية' : 'Cancelled Orders'}</option>
              <option value="Returned">{t('returnedStatus')}</option>
            </select>
            
            <select 
              className="input-field" 
              style={{ flex: '1 1 120px' }} 
              value={filterOutlet} 
              onChange={e => setFilterOutlet(e.target.value)}
              disabled={user?.role !== 'admin'}
            >
               <option value="All">{language === 'ar' ? 'جميع المنافذ' : 'All Outlets'}</option>
               <option value="eltalg">{t('eltalg')}</option>
               <option value="tegara">{t('tegara')}</option>
               <option value="mostashfa">{t('mostashfa')}</option>
            </select>

            <select className="input-field" style={{ flex: '1 1 120px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
               <option value="All">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
               {JUMIA_CATEGORIES.map(cat => (
                 <option key={cat.en} value={cat.en}>{language === 'ar' ? cat.ar : cat.en}</option>
               ))}
            </select>

            <select className="input-field" style={{ flex: '1 1 120px' }} value={filterSize} onChange={e => setFilterSize(e.target.value)}>
               <option value="All">{language === 'ar' ? 'جميع المقاسات' : 'All Sizes'}</option>
               <option value="S">S</option>
               <option value="M">M</option>
               <option value="L">L</option>
            </select>

            <select className="input-field" style={{ flex: '1 1 120px' }} value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)}>
               <option value="All">{language === 'ar' ? 'جميع طرق الدفع' : 'All Payments'}</option>
               <option value="Cash">{language === 'ar' ? 'كاش' : 'Cash'}</option>
               <option value="JumiaPay">JumiaPay</option>
               <option value="VISA">VISA</option>
            </select>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1 1 300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input 
                  type="date" 
                  className="input-field" 
                  style={{ fontSize: '0.8rem' }}
                  value={filterDateStart}
                  onChange={e => setFilterDateStart(e.target.value)}
                  title={language === 'ar' ? 'من تاريخ' : 'From Date'}
                />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input 
                  type="date" 
                  className="input-field" 
                  style={{ fontSize: '0.8rem' }}
                  value={filterDateEnd}
                  onChange={e => setFilterDateEnd(e.target.value)}
                  title={language === 'ar' ? 'إلى تاريخ' : 'To Date'}
                />
              </div>
              {(filterDateStart || filterDateEnd || filterOutlet !== 'All' || searchTerm || filterStatus !== 'Inventory' || filterCategory !== 'All' || filterSize !== 'All' || filterPaymentMethod !== 'All') && (
                <button 
                  onClick={() => updateFilters('orders', {
                    searchTerm: '',
                    status: 'Inventory',
                    outlet: 'All',
                    category: 'All',
                    size: 'All',
                    dateStart: '',
                    dateEnd: '',
                    paymentMethod: 'All'
                  })}
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <ExportActions 
              data={orderList} 
              headers={exportHeaders} 
              filename="Inventory_Export" 
              title={t('inventory')} 
            />
            <button className="btn btn-primary" onClick={() => setShowSimulateModal(true)}>
              <Plus size={18} /> {t('receiveNewOrder')}
            </button>
          </div>
        </div>

        {/* Inventory Summary Table */}
        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ color: 'var(--color-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}>
             <Filter size={18} /> {language === 'ar' ? 'ملخص مخزون الطلبات' : 'Orders Inventory Summary'}
          </h4>
          <div className="table-container">
            <table className="data-table" style={{ fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
                  <th>{t('pickedFromJumia')}</th>
                  <th>{t('pickedUpByCustomer')}</th>
                  <th>{language === 'ar' ? 'ملغي' : 'Cancelled'}</th>
                  <th>{language === 'ar' ? 'مرتجع' : 'Returned'}</th>
                  <th>{t('inventory')}</th>
                  <th>{language === 'ar' ? 'اجمالي' : 'Total'}</th>
                  <th style={{ background: 'rgba(255,255,255,0.03)' }}>{language === 'ar' ? 'كاش (عدد)' : 'Cash (Qty)'}</th>
                  <th style={{ background: 'rgba(255,255,255,0.03)' }}>{language === 'ar' ? 'كاش (مبلغ)' : 'Cash (Amt)'}</th>
                  <th style={{ background: 'rgba(255,165,0,0.05)' }}>{language === 'ar' ? 'جوميا باي (عدد)' : 'JumiaPay (Qty)'}</th>
                  <th style={{ background: 'rgba(255,165,0,0.05)' }}>{language === 'ar' ? 'جوميا باي (مبلغ)' : 'JumiaPay (Amt)'}</th>
                  <th style={{ color: 'var(--color-primary)' }}>{language === 'ar' ? 'رسوم التخزين' : 'Storage Fees'}</th>
                  <th>S</th>
                  <th>M</th>
                  <th>L</th>
                </tr>
              </thead>
              <tbody>
                {summaryByOutlet.map((row, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 700 }}>{getOutletLabel(row.outlet)}</td>
                    <td>{row.received}</td>
                    <td style={{ color: 'var(--color-success)' }}>{row.pickedUp}</td>
                    <td style={{ color: 'var(--color-warning)' }}>{row.cancelled}</td>
                    <td style={{ color: 'var(--color-danger)' }}>{row.returned}</td>
                    <td style={{ fontWeight: 600 }}>{row.available}</td>
                    <td style={{ fontWeight: 700 }}>{row.totalMoney.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td style={{ background: 'rgba(255,255,255,0.02)' }}>{row.cashQty}</td>
                    <td style={{ background: 'rgba(255,255,255,0.02)' }}>{row.cashAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td style={{ background: 'rgba(255,165,0,0.03)', color: '#f97316', fontWeight: 600 }}>{row.jumiaPayQty}</td>
                    <td style={{ background: 'rgba(255,165,0,0.03)', color: '#f97316', fontWeight: 600 }}>{row.jumiaPayAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td style={{ fontWeight: 600 }}>{row.storageFees.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                    <td>{row.sCount}</td>
                    <td>{row.mCount}</td>
                    <td>{row.lCount}</td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr style={{ background: 'rgba(var(--hue-primary), 80%, 65%, 0.1)', borderTop: '2px solid var(--color-primary)' }}>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{language === 'ar' ? 'الإجمالي' : 'GRAND TOTAL'}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.received, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.pickedUp, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.cancelled, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.returned, 0)}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.available, 0)}</td>
                  <td style={{ fontWeight: 800 }}>{summaryByOutlet.reduce((sum, r) => sum + r.totalMoney, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td style={{ fontWeight: 700, background: 'rgba(255,255,255,0.05)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.cashQty, 0)}</td>
                  <td style={{ fontWeight: 700, background: 'rgba(255,255,255,0.05)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.cashAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td style={{ fontWeight: 800, background: 'rgba(255,165,0,0.08)', color: '#f97316' }}>{summaryByOutlet.reduce((sum, r) => sum + r.jumiaPayQty, 0)}</td>
                  <td style={{ fontWeight: 800, background: 'rgba(255,165,0,0.08)', color: '#f97316' }}>{summaryByOutlet.reduce((sum, r) => sum + r.jumiaPayAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.storageFees, 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.sCount, 0)}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.mCount, 0)}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.lCount, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="table-container" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('orderId')} {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('customer')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('customer')} {sortConfig.key === 'customer' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('description')} {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('receivedAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('pickedFromJumia')} {sortConfig.key === 'receivedAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('status')} {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('pickedUpAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('pickedUpByCustomer')} {sortConfig.key === 'pickedUpAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('daysParked')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {t('daysInInv')} {sortConfig.key === 'daysParked' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.length > 0 ? paginatedOrders.map(order => (
                <tr key={order.id} style={{ opacity: order.status === 'Returned' ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{order.id}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{order.customerName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '1px 5px', width: 'fit-content', marginTop: '2px' }}>{order.tier}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.9rem' }}>{order.description}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                        {(order.totalValue - (order.discountAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                        {order.discountAmount > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', [language === 'ar' ? 'marginRight' : 'marginLeft']: '0.4rem', textDecoration: 'line-through', fontWeight: 400 }}>
                            {order.totalValue.toLocaleString()}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {(() => {
                          const cat = JUMIA_CATEGORIES.find(c => c.en === order.category);
                          return language === 'ar' ? (cat?.ar || order.category) : (cat?.en || order.category);
                        })()}
                      </span>
                      {order.subcategory && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {(() => {
                            const cat = JUMIA_CATEGORIES.find(c => c.en === order.category);
                            const sub = cat?.subcategories.find(s => s.en === order.subcategory);
                            return language === 'ar' ? (sub?.ar || order.subcategory) : (sub?.en || order.subcategory);
                          })()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>
                        {new Date(order.receivedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', month: 'short', day: '2-digit' })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(order.receivedAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginTop: '2px', padding: '1px 4px' }}>
                        {getOutletLabel(order.outlet)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${order.status === 'Inventory' ? 'badge-warning' : order.status === 'Picked Up' ? 'badge-success' : order.status === 'Cancelled' ? 'badge-warning' : 'badge-danger'}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    {order.status === 'Picked Up' ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                          {new Date(order.pickedUpAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', month: 'short', day: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(order.pickedUpAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem', marginTop: '2px', padding: '1px 4px' }}>
                          {order.paymentMethod === 'Cash' || !order.paymentMethod ? (language === 'ar' ? 'كاش' : 'Cash') : order.paymentMethod}
                        </span>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    {order.status === 'Inventory' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '8px', height: '8px', borderRadius: '50%', 
                          background: order.daysParked >= 4 ? 'var(--color-danger)' : order.daysParked >= 2 ? 'var(--color-warning)' : 'var(--color-success)'
                        }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{order.daysParked} {t('days')}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)' }}>{order.penalty?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP {t('penalty')}</span>
                        </div>
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} title={language === 'ar' ? 'تعديل' : 'Edit'} onClick={() => { setEditingOrder(order); setOriginalOrderId(order.id); }}>
                        <Pencil size={16} />
                      </button>

                      {order.status === 'Inventory' && (
                        <>
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} title={t('markPickedUp')} onClick={() => { 
                            const cust = customers.find(c => c.phone === order.customerPhone);
                            setCustomerUpdateData({
                              phone: cust?.phone || order.customerPhone,
                              name: cust?.name || '',
                              email: cust?.email || '',
                              address: cust?.address || ''
                            });
                            setNewOrder({...newOrder, paymentMethod: order.paymentMethod});
                            setPendingOrderId(order.id); 
                            setShowCrossSellModal(true); 
                          }}>
                            <UserCheck size={16} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title={t('markReturned')} onClick={() => returnOrder(order.id)}>
                            <RefreshCw size={16} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: '#f59e0b' }} title={language === 'ar' ? 'إلغاء' : 'Cancel'} onClick={() => { setTargetOrder(order); setShowCancelModal(true); }}>
                            <X size={16} />
                          </button>
                          <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title={language === 'ar' ? 'حذف' : 'Delete'} onClick={() => { setTargetOrder(order); setShowDeleteModal(true); }}>
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                    {order.status === 'Cancelled' && (
                       <div style={{ display: 'flex', gap: '0.5rem' }}>
                         <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title={t('markReturned')} onClick={() => returnOrder(order.id)}>
                           <RefreshCw size={16} />
                         </button>
                         <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => revertOrderToInventory(order.id)}>
                           <RotateCcw size={16} />
                           <span style={{ fontSize: '0.75rem' }}>{language === 'ar' ? 'إعادة للمخزن' : 'Revert'}</span>
                         </button>
                       </div>
                    )}
                    {order.status === 'Returned' && (
                       <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => revertOrderToInventory(order.id)}>
                         <RotateCcw size={16} />
                         <span style={{ fontSize: '0.75rem' }}>{language === 'ar' ? 'إعادة للمخزن' : 'Undo Return'}</span>
                       </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {orderList.length > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem 0.5rem', 
            borderTop: '1px solid rgba(255,255,255,0.05)',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? 'عرض' : 'Showing'} <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{Math.min(orderList.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(orderList.length, currentPage * itemsPerPage)}</span> {language === 'ar' ? 'من أصل' : 'of'} <span style={{ fontWeight: 600 }}>{orderList.length}</span> {language === 'ar' ? 'طلب' : 'orders'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'لكل صفحة:' : 'Per page:'}</span>
                <select 
                  className="input-field" 
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', minWidth: '60px' }}
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem', minWidth: '36px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {/* Simple page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Show pages around current page
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;

                  return (
                    <button
                      key={pageNum}
                      className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.4rem', minWidth: '36px', fontSize: '0.85rem' }}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button 
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem', minWidth: '36px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════ Customer Returns Section ═══════════════════ */}
      <div className="glass-panel" style={{
        background: 'var(--bg-overlay)',
        border: '1px solid rgba(168,85,247,0.2)',
        borderTop: '3px solid #a855f7',
        marginTop: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: '1 1 200px' }}>
            <h4 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
              <RotateCcw size={20} color="#a855f7" /> {t('customerReturns')}
            </h4>
            <p style={{ color: 'var(--text-secondary)', margin: '0.3rem 0 0 0', fontSize: '0.8rem' }}>
              {t('customerReturnsDesc')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input-field" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }} value={returnFilterStatus} onChange={e => setReturnFilterStatus(e.target.value)}>
              <option value="At Station">{t('atStation')}</option>
              <option value="Returned to Jumia">{t('returnedToJumia')}</option>
              <option value="All">{language === 'ar' ? 'الكل' : 'All'}</option>
            </select>
            <ExportActions
              data={(customerReturns || []).filter(r => {
                const matchesStatus = returnFilterStatus === 'All' || r.status === returnFilterStatus;
                const matchesSearch = !searchTerm || (r.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) || r.customerPhone.includes(searchTerm));
                const matchesOutlet = filterOutlet === 'All' || normalizeOutlet(r.outlet) === filterOutlet;
                const matchesDate = !filterDateStart && !filterDateEnd ? true : (isInRange(r.receivedAt, filterDateStart, filterDateEnd) || (r.returnedAt && isInRange(r.returnedAt, filterDateStart, filterDateEnd)));
                return matchesStatus && matchesSearch && matchesOutlet && matchesDate;
              })}
              headers={[
                { label: t('orderId'), accessor: 'orderId' },
                { label: t('customer'), accessor: 'customerName' },
                { label: t('phone'), accessor: 'customerPhone' },
                { label: t('description'), accessor: 'description' },
                { label: t('returnReason'), accessor: 'reason' },
                { label: t('receivedAt'), accessor: r => new Date(r.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' }) },
                { label: t('status'), accessor: r => r.status === 'At Station' ? t('atStation') : t('returnedToJumia') },
                { label: language === 'ar' ? 'تاريخ الارجاع لـ جوميا' : 'Returned to Jumia Date', accessor: r => r.returnedAt ? new Date(r.returnedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' }) : '-' }
              ]}
              filename="Customer_Returns_Export"
              title={t('customerReturns')}
            />
            <button className="btn btn-outline" style={{ color: '#a855f7', borderColor: 'rgba(168,85,247,0.4)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowReturnModal(true)}>
              <PackageX size={16} /> {t('receiveCustomerReturn')}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>{t('orderId')}</th>
                <th>{t('customer')}</th>
                <th>{t('description')}</th>
                <th>{t('returnReason')}</th>
                <th>{t('receivedAt')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(customerReturns || []).filter(r => {
                const matchesStatus = returnFilterStatus === 'All' || r.status === returnFilterStatus;
                const matchesSearch = !searchTerm || (r.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) || r.customerPhone.includes(searchTerm));
                const matchesOutlet = filterOutlet === 'All' || normalizeOutlet(r.outlet) === filterOutlet;
                const matchesDate = !filterDateStart && !filterDateEnd ? true : (isInRange(r.receivedAt, filterDateStart, filterDateEnd) || (r.returnedAt && isInRange(r.returnedAt, filterDateStart, filterDateEnd)));
                return matchesStatus && matchesSearch && matchesOutlet && matchesDate;
              }).length > 0 ? (customerReturns || []).filter(r => {
                const matchesStatus = returnFilterStatus === 'All' || r.status === returnFilterStatus;
                const matchesSearch = !searchTerm || (r.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) || r.customerPhone.includes(searchTerm));
                const matchesOutlet = filterOutlet === 'All' || normalizeOutlet(r.outlet) === filterOutlet;
                const matchesDate = !filterDateStart && !filterDateEnd ? true : (isInRange(r.receivedAt, filterDateStart, filterDateEnd) || (r.returnedAt && isInRange(r.returnedAt, filterDateStart, filterDateEnd)));
                return matchesStatus && matchesSearch && matchesOutlet && matchesDate;
              }).map(ret => (
                <tr key={ret.id}>
                  <td style={{ fontWeight: 600 }}>{ret.orderId || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500 }}>{ret.customerName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ret.customerPhone}</span>
                    </div>
                  </td>
                  <td>{ret.description}</td>
                  <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ret.reason || '-'}</span></td>
                  <td>{new Date(ret.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' })}</td>
                  <td>
                    <span className={`badge ${ret.status === 'At Station' ? 'badge-warning' : 'badge-success'}`}>
                      {ret.status === 'At Station' ? t('atStation') : t('returnedToJumia')}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {(ret.status === 'At Station' || user?.role === 'admin') && (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem', color: 'var(--color-primary)' }} 
                          title={language === 'ar' ? 'تعديل' : 'Edit'}
                          onClick={() => setEditingReturn({ ...ret })}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      
                      {ret.status === 'At Station' && (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} 
                          onClick={() => markReturnedToJumia(ret.id)}
                        >
                          <Check size={14} />
                          <span style={{ fontSize: '0.75rem' }}>{t('markReturnedToJumia')}</span>
                        </button>
                      )}
                      {ret.status === 'Returned to Jumia' && (
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '0.4rem 0.8rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }} 
                          onClick={() => revertCustomerReturn(ret.id)}
                        >
                          <RotateCcw size={16} />
                          <span style={{ fontSize: '0.75rem' }}>{language === 'ar' ? 'إلغاء الإرجاع' : 'Undo Return'}</span>
                        </button>
                      )}

                      <button 
                        className="btn btn-outline" 
                        style={{ padding: '0.4rem', color: 'var(--color-danger)' }} 
                        title={language === 'ar' ? 'حذف' : 'Delete'}
                        onClick={() => { setTargetReturn(ret); setShowDeleteReturnModal(true); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <PackageX size={30} style={{ margin: '0 auto 0.5rem', opacity: 0.4, display: 'block' }} />
                    {language === 'ar' ? 'لا توجد مرتجعات عملاء.' : 'No customer returns found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════ Modals ═══════════════════ */}
      
      {/* Simulation Modal */}
      {showSimulateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('receiveNewOrder')}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button"
                  className="btn btn-outline" 
                  style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: isScanning ? 'var(--color-danger)' : 'var(--color-primary)', color: isScanning ? 'var(--color-danger)' : 'var(--color-primary)' }}
                  onClick={() => setIsScanning(!isScanning)}
                >
                  {isScanning ? <XCircle size={16} /> : <QrCode size={16} />}
                  {isScanning ? (language === 'ar' ? 'إغلاق الماسح' : 'Close Scanner') : (language === 'ar' ? 'Scan QR' : 'Scan QR')}
                </button>
              </div>
            </div>

            {isScanning && (
              <div className="glass-panel" style={{ marginBottom: '1.5rem', overflow: 'hidden', position: 'relative', background: '#000', minHeight: '200px' }}>
                <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }}></div>
                <div style={{ position: 'absolute', top: '10px', left: '10px', color: '#fff', fontSize: '0.75rem', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px', zIndex: 10 }}>
                  {language === 'ar' ? 'ضع الكود أمام الكاميرا' : 'Point camera at QR code'}
                </div>
              </div>
            )}

            <form onSubmit={handleSimulateReceive}>
              <div className="input-group">
                <label className="input-label">{t('orderId')}</label>
                <input required className="input-field" value={newOrder.id} onChange={e => setNewOrder({...newOrder, id: e.target.value})} placeholder="e.g. ORD-9999" />
              </div>
              <div className="input-group" style={{ position: 'relative' }}>
                <label className="input-label">{t('phone')}</label>
                <input 
                  required 
                  className="input-field" 
                  value={newOrder.customerPhone} 
                  onChange={e => handlePhoneChange(e.target.value)} 
                  placeholder="01..." 
                  autoComplete="off"
                />
                {phoneSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}>
                    {phoneSuggestions.map((cust, idx) => (
                      <div 
                        key={cust.phone}
                        style={{
                          padding: '0.6rem 1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          transition: 'background 0.2s',
                          background: hoveredIdx === idx ? 'var(--bg-overlay-hover)' : 'transparent'
                        }}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => {
                          setNewOrder({
                            ...newOrder,
                            customerPhone: cust.phone,
                            customerName: cust.name
                          });
                          setPhoneSuggestions([]);
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{cust.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{cust.phone}</span>
                        </div>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{cust.tier}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="input-group">
                 <label className="input-label">{t('customer')}</label>
                 <input required className="input-field" value={newOrder.customerName} onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} placeholder={t('name')} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('description')}</label>
                <input required className="input-field" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} placeholder="Items..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">{language === 'ar' ? 'اجمالي الفلوس' : 'Total Value'}</label>
                  <input required type="number" step="0.01" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({...newOrder, totalValue: e.target.value})} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">{t('category')}</label>
                    <select 
                      className="input-field" 
                      value={newOrder.category} 
                      onChange={e => {
                        const catVal = e.target.value;
                        const cat = JUMIA_CATEGORIES.find(c => c.en === catVal || c.ar === catVal);
                        setNewOrder({
                          ...newOrder, 
                          category: cat?.en || catVal, 
                          subcategory: cat?.subcategories[0]?.en || ''
                        });
                      }}
                    >
                      <option value="" disabled>{language === 'ar' ? 'اختر الفئة' : 'Select Category'}</option>
                      {JUMIA_CATEGORIES.map(cat => (
                        <option key={cat.en} value={cat.en}>{language === 'ar' ? cat.ar : cat.en}</option>
                      ))}
                    </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'الفئة الفرعية' : 'Sub-category'}</label>
                <select 
                  className="input-field" 
                  value={newOrder.subcategory} 
                  onChange={e => setNewOrder({...newOrder, subcategory: e.target.value})}
                  required
                >
                  {(() => {
                    const cat = JUMIA_CATEGORIES.find(c => c.en === newOrder.category || c.ar === newOrder.category);
                    const subs = cat?.subcategories || [];
                    if (subs.length === 0) return <option value="">{language === 'ar' ? 'اختر الفئة أولاً' : 'Select Category First'}</option>;
                    return subs.map(sub => (
                      <option key={sub.en} value={sub.en}>{language === 'ar' ? sub.ar : sub.en}</option>
                    ));
                  })()}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('packageSize')}</label>
                <select required className="input-field" value={newOrder.size} onChange={e => setNewOrder({...newOrder, size: e.target.value})}>
                  <option value="" disabled>{language === 'ar' ? 'اختر المقاس' : 'Select Size'}</option>
                  <option value="S">{t('small')}</option>
                  <option value="M">{t('medium')}</option>
                  <option value="L">{t('big')}</option>
                </select>
              </div>

              <div className="input-group" style={{ position: 'relative' }}>
                <label className="input-label">{language === 'ar' ? 'كود الخصم (اختياري)' : 'Discount Code (Optional)'}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="input-field" 
                    value={newOrder.discountCode} 
                    onChange={e => setNewOrder({...newOrder, discountCode: e.target.value.toUpperCase()})} 
                    placeholder="PROMO10"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.8rem' }}
                    onClick={async () => {
                      if (!newOrder.discountCode || newOrder.discountCode.trim() === '') {
                        setNewOrder({...newOrder, discountAmount: 0, discountCode: null});
                        alert(language === 'ar' ? 'تم إزالة الخصم' : 'Discount removed');
                        return;
                      }
                      const res = await validateDiscount(newOrder.discountCode, newOrder.customerPhone, newOrder.totalValue);
                      if (res.success) {
                        const amt = res.discount.type === 'PERCENT' 
                          ? (parseFloat(newOrder.totalValue) * res.discount.value / 100) 
                          : res.discount.value;
                        setNewOrder({...newOrder, discountAmount: amt});
                        alert(language === 'ar' ? `تم تطبيق خصم بقيمة ${amt} EGP` : `Discount of ${amt} EGP applied!`);
                      } else {
                        alert(res.error);
                      }
                    }}
                  >
                    {language === 'ar' ? 'تفعيل' : 'Verify'}
                  </button>
                </div>
                {newOrder.discountAmount > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: '0.25rem', fontWeight: 600 }}>
                    {language === 'ar' ? `خصم مفعل: -${newOrder.discountAmount} EGP` : `Active Discount: -${newOrder.discountAmount} EGP`}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setShowSimulateModal(false); setPhoneSuggestions([]); }}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-panel)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <Pencil size={20} color="var(--color-primary)" />
                {language === 'ar' ? 'تعديل بيانات الطلب' : 'Edit Order Details'}
              </h3>
              <button className="btn-outline" style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setEditingOrder(null)}>&times;</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{language === 'ar' ? 'رقم الطلب' : 'Order ID'}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingOrder.id} 
                  onChange={e => setEditingOrder({...editingOrder, id: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('phone')}</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={editingOrder.customerPhone} 
                  onChange={e => setEditingOrder({...editingOrder, customerPhone: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('description')}</label>
                <textarea 
                  className="input-field" 
                  value={editingOrder.description} 
                  onChange={e => setEditingOrder({...editingOrder, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('value')} (EGP)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field" 
                    value={editingOrder.totalValue} 
                    onChange={e => setEditingOrder({...editingOrder, totalValue: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('category')}</label>
                  <select 
                    className="input-field" 
                    value={editingOrder.category} 
                    onChange={e => {
                      const catVal = e.target.value;
                      const cat = JUMIA_CATEGORIES.find(c => c.en === catVal || c.ar === catVal);
                      setEditingOrder({
                        ...editingOrder, 
                        category: cat?.en || catVal, 
                        subcategory: cat?.subcategories[0]?.en || ''
                      });
                    }}
                  >
                    {JUMIA_CATEGORIES.map(cat => (
                      <option key={cat.en} value={cat.en}>{language === 'ar' ? cat.ar : cat.en}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{language === 'ar' ? 'الفئة الفرعية' : 'Sub-category'}</label>
                <select 
                  className="input-field" 
                  value={editingOrder.subcategory} 
                  onChange={e => setEditingOrder({...editingOrder, subcategory: e.target.value})}
                  required
                >
                  {(() => {
                    const cat = JUMIA_CATEGORIES.find(c => c.en === editingOrder.category || c.ar === editingOrder.category);
                    const subs = cat?.subcategories || [];
                    if (subs.length === 0) return <option value="">{language === 'ar' ? 'اختر الفئة أولاً' : 'Select Category First'}</option>;
                    return subs.map(sub => (
                      <option key={sub.en} value={sub.en}>{language === 'ar' ? sub.ar : sub.en}</option>
                    ));
                  })()}
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{t('packageSize')}</label>
                <select 
                  className="input-field" 
                  value={editingOrder.size} 
                  onChange={e => setEditingOrder({...editingOrder, size: e.target.value})}
                >
                  <option value="S">{t('small')}</option>
                  <option value="M">{t('medium')}</option>
                  <option value="L">{t('big')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{language === 'ar' ? 'المنفذ' : 'Outlet'}</label>
                <select 
                  className="input-field" 
                  value={editingOrder.outlet} 
                  onChange={e => setEditingOrder({...editingOrder, outlet: e.target.value})}
                  disabled={false}
                >
                  <option value="eltalg">{t('eltalg')}</option>
                  <option value="tegara">{t('tegara')}</option>
                  <option value="mostashfa">{t('mostashfa')}</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                <select 
                  className="input-field" 
                  value={editingOrder.paymentMethod} 
                  onChange={e => setEditingOrder({...editingOrder, paymentMethod: e.target.value})}
                >
                  <option value="Cash">{language === 'ar' ? 'كاش' : 'Cash'}</option>
                  <option value="JumiaPay">JumiaPay</option>
                  <option value="VISA">VISA</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem', display: 'block' }}>{language === 'ar' ? 'كود الخصم (اختياري)' : 'Discount Code (Optional)'}</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={editingOrder.discountCode || ''} 
                    onChange={e => setEditingOrder({...editingOrder, discountCode: e.target.value.toUpperCase()})}
                    placeholder="PROMO10"
                    style={{ flex: 1 }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.8rem' }}
                    onClick={async () => {
                      if (!editingOrder.discountCode || editingOrder.discountCode.trim() === '') {
                        setEditingOrder({...editingOrder, discountAmount: 0, discountCode: null});
                        alert(language === 'ar' ? 'تم إزالة الخصم' : 'Discount removed');
                        return;
                      }
                      const res = await validateDiscount(editingOrder.discountCode, editingOrder.customerPhone, editingOrder.totalValue, editingOrder.id);
                      if (res.success) {
                        const amt = res.discount.type === 'PERCENT' 
                          ? (parseFloat(editingOrder.totalValue) * res.discount.value / 100) 
                          : res.discount.value;
                        setEditingOrder({...editingOrder, discountAmount: amt});
                        alert(language === 'ar' ? `تم تطبيق خصم بقيمة ${amt} EGP` : `Discount of ${amt} EGP applied!`);
                      } else {
                        alert(res.error);
                      }
                    }}
                  >
                    {language === 'ar' ? 'تفعيل' : 'Verify'}
                  </button>
                </div>
                {editingOrder.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      {language === 'ar' ? `خصم مفعل: -${editingOrder.discountAmount} EGP` : `Active Discount: -${editingOrder.discountAmount} EGP`}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {language === 'ar' ? 'الإجمالي الصافي: ' : 'Net Total: '}
                      {(parseFloat(editingOrder.totalValue || 0) - editingOrder.discountAmount).toLocaleString()} EGP
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={async () => {
                    if (!editingOrder.id || !editingOrder.customerPhone || !editingOrder.description || !editingOrder.totalValue || !editingOrder.size) {
                      alert(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
                      return;
                    }
                    const res = await updateOrder(originalOrderId, {
                      newId: editingOrder.id,
                      customerPhone: editingOrder.customerPhone,
                      description: editingOrder.description,
                      totalValue: parseFloat(editingOrder.totalValue),
                      category: editingOrder.category,
                      subcategory: editingOrder.subcategory,
                      outlet: editingOrder.outlet,
                      size: editingOrder.size,
                      paymentMethod: editingOrder.paymentMethod,
                      discountCode: editingOrder.discountCode,
                      discountAmount: editingOrder.discountAmount
                    });
                    if (res.success) {
                      setEditingOrder(null);
                      setOriginalOrderId(null);
                    } else alert("Error: " + res.error);
                  }}
                >
                  {language === 'ar' ? 'حفظ' : 'Save'}
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingOrder(null)}>
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Sell Modal */}
      {showCrossSellModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)', textAlign: 'center', border: '1px solid var(--color-primary)' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
               <CreditCard size={32} color="var(--color-primary)" />
            </div>
            <h3>{language === 'ar' ? 'عرض كارت ميزة' : 'Meeza Card Offer'}</h3>
            <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>{language === 'ar' ? 'هل قمت بعرض كارت ميزة على العميل؟' : 'Did you offer Meeza Card to the customer?'}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <button className="btn btn-primary" onClick={() => { markOrderPickedUp(pendingOrderId); setShowCrossSellModal(false); }}>
                 {language === 'ar' ? 'نعم (تأكيد)' : 'Yes (Confirm)'}
               </button>
               <button className="btn btn-outline" onClick={() => setShowCrossSellModal(false)}>
                 {t('cancel')}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Return Modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>{t('receiveCustomerReturn')}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const res = await receiveCustomerReturn(newReturn);
              if (res.success) {
                setShowReturnModal(false);
                setNewReturn({
                  orderId: '',
                  customerPhone: '',
                  customerName: '',
                  description: '',
                  reason: '',
                  outlet: user?.outlet || 'eltalg'
                });
              }
            }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{t('orderId')}</label>
                  <input className="input-field" value={newReturn.orderId} onChange={e => setNewReturn({...newReturn, orderId: e.target.value})} placeholder="e.g. ORD..." />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                   <label className="input-label">{t('phone')}</label>
                   <input required className="input-field" value={newReturn.customerPhone} onChange={e => setNewReturn({...newReturn, customerPhone: e.target.value})} placeholder="01..." />
                </div>
              </div>
              
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">{t('customer')}</label>
                <input required className="input-field" value={newReturn.customerName} onChange={e => setNewReturn({...newReturn, customerName: e.target.value})} placeholder={t('name')} />
              </div>

              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">{t('description')}</label>
                <textarea className="input-field" required value={newReturn.description} onChange={e => setNewReturn({...newReturn, description: e.target.value})} rows={3} placeholder="Items..." />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => {
                  setShowReturnModal(false);
                  setNewReturn({
                    orderId: '',
                    customerPhone: '',
                    customerName: '',
                    description: '',
                    reason: '',
                    outlet: user?.outlet || 'eltalg'
                  });
                }}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-warning)' }}>{language === 'ar' ? 'إلغاء الطلب' : 'Cancel Order'}</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? `هل أنت متأكد من إلغاء الطلب رقم ${targetOrder?.id}؟ سيتم وضعه في قائمة المرتجعات المطلوبة.` : `Are you sure you want to cancel order ${targetOrder?.id}? It will be flagged for return.`}
            </p>
            <div className="input-group">
              <label className="input-label">{language === 'ar' ? 'سبب الإلغاء' : 'Cancellation Reason'}</label>
              <textarea className="input-field" value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder={language === 'ar' ? 'ادخل السبب هنا...' : 'Enter reason here...'} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--color-warning)', color: '#000' }}
                onClick={async () => {
                  if (!cancelReason.trim()) return alert(language === 'ar' ? 'يرجى إدخال السبب' : 'Please enter a reason');
                  const res = await cancelOrder(targetOrder.id, cancelReason);
                  if (res.success) {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setTargetOrder(null);
                  }
                }}
              >
                {t('confirm')}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCancelModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Order Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>{language === 'ar' ? 'حذف الطلب' : 'Delete Order'}</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? `هل أنت متأكد من حذف الطلب رقم ${targetOrder?.id}؟ سيتم إخفاء الطلب نهائياً من القائمة.` : `Are you sure you want to delete order ${targetOrder?.id}? This will remove it from the active inventory list.`}
            </p>
            <div className="input-group">
              <label className="input-label">{language === 'ar' ? 'سبب الحذف' : 'Deletion Reason'}</label>
              <textarea className="input-field" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} rows={3} placeholder={language === 'ar' ? 'ادخل السبب هنا...' : 'Enter reason here...'} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--color-danger)' }}
                onClick={async () => {
                  if (!deleteReason.trim()) return alert(language === 'ar' ? 'يرجى إدخال السبب' : 'Please enter a reason');
                  const res = await deleteOrder(targetOrder.id, deleteReason);
                  if (res.success) {
                    setShowDeleteModal(false);
                    setDeleteReason('');
                    setTargetOrder(null);
                  }
                }}
              >
                {t('confirm')}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Return Modal */}
      {editingReturn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-panel)' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pencil size={20} color="var(--color-primary)" />
              {language === 'ar' ? 'تعديل بيانات المرتجع' : 'Edit Return Details'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">{t('orderId')}</label>
                <input className="input-field" value={editingReturn.orderId || ''} onChange={e => setEditingReturn({...editingReturn, orderId: e.target.value})} placeholder="ORD..." />
              </div>
              <div className="input-group">
                <label className="input-label">{t('phone')}</label>
                <input required className="input-field" value={editingReturn.customerPhone} onChange={e => setEditingReturn({...editingReturn, customerPhone: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('customer')}</label>
                <input required className="input-field" value={editingReturn.customerName} onChange={e => setEditingReturn({...editingReturn, customerName: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('description')}</label>
                <textarea className="input-field" required value={editingReturn.description} onChange={e => setEditingReturn({...editingReturn, description: e.target.value})} rows={3} />
              </div>
              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'المنفذ' : 'Outlet'}</label>
                <select className="input-field" value={editingReturn.outlet} onChange={e => setEditingReturn({...editingReturn, outlet: e.target.value})}>
                  <option value="eltalg">{t('eltalg')}</option>
                  <option value="tegara">{t('tegara')}</option>
                  <option value="mostashfa">{t('mostashfa')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const res = await updateCustomerReturn(editingReturn.id, {
                      orderId: editingReturn.orderId,
                      customerPhone: editingReturn.customerPhone,
                      customerName: editingReturn.customerName,
                      description: editingReturn.description,
                      outlet: editingReturn.outlet
                    });
                    if (res.success) setEditingReturn(null);
                  }}
                >
                  {t('confirm')}
                </button>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingReturn(null)}>{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Return Modal */}
      {showDeleteReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-danger)' }}>{language === 'ar' ? 'حذف سجل المرتجع' : 'Delete Return Record'}</h3>
            <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {language === 'ar' ? `هل أنت متأكد من حذف سجل المرتجع للعميل ${targetReturn?.customerName}؟ سيتم حذف السجل نهائياً.` : `Are you sure you want to delete the return record for ${targetReturn?.customerName}? This action is permanent.`}
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, background: 'var(--color-danger)' }}
                onClick={async () => {
                  const res = await deleteCustomerReturn(targetReturn.id);
                  if (res.success) {
                    setShowDeleteReturnModal(false);
                    setTargetReturn(null);
                  }
                }}
              >
                {t('confirm')}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowDeleteReturnModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
