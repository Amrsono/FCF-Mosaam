import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import { Search, Filter, Plus, UserCheck, RefreshCw, FileUp, CreditCard, Gift, AlertCircle, Flag, PackageX, RotateCcw, Check, Pencil, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

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
    updateOrder,
    cancelOrder,
    deleteOrder,
    revertOrderToInventory
  } = useDashboard();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Inventory');
  const [filterOutlet, setFilterOutlet] = useState(user?.role === 'admin' ? 'All' : (user?.outlet || 'eltalg'));
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('All');

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '',
    customerPhone: '',
    description: '',
    totalValue: '',
    category: 'Electronics',
    customerName: '',
    outlet: user?.outlet || 'eltalg',
    size: 'M',
    paymentMethod: 'Cash'
  });

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

  const normalizeOutlet = (val) => {
    if (!val || val === 'eltalg' || val === 'Banha 1' || val === 'وبور الثلج' || val === 'وبور التلج') return 'eltalg';
    if (val === 'tegara' || val === 'Banha 2' || val === 'تجارة' || val === 'تجاره') return 'tegara';
    if (val === 'mostashfa' || val === 'Banha 3' || val === 'المستشفي' || val === 'المستشفى') return 'mostashfa';
    return val;
  };

  // Base filtering logic (excluding status for summary)
  const isInRange = (dateStr, startStr, endStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (startStr) {
      const s = new Date(startStr);
      s.setHours(0, 0, 0, 0);
      if (d < s) return false;
    }
    if (endStr) {
      const e = new Date(endStr);
      e.setHours(23, 59, 59, 999);
      if (d > e) return false;
    }
    return true;
  };

  const allFilteredOrders = useMemo(() => {
    return orders.map(order => {
      const cust = customers.find(c => c.phone === order.customerPhone);
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
      const matchesTier = filterTier === 'All' || order.tier === filterTier;
      const matchesOutlet = filterOutlet === 'All' || normalizeOutlet(order.outlet) === filterOutlet;
      const matchesPayment = filterPaymentMethod === 'All' || order.paymentMethod === filterPaymentMethod;
      
      return matchesSearch && matchesCategory && matchesTier && matchesOutlet && matchesPayment;
    });
  }, [orders, customers, searchTerm, filterCategory, filterTier, filterOutlet, filterPaymentMethod, calculatePenalty, language]);

  // Display filtering logic (including status and status-specific date logic)
  const orderList = useMemo(() => {
    return allFilteredOrders
      .filter(order => {
        if (filterDateStart || filterDateEnd) {
          if (filterStatus === 'Inventory') return isInRange(order.receivedAt, filterDateStart, filterDateEnd);
          if (filterStatus === 'Picked Up') return isInRange(order.pickedUpAt, filterDateStart, filterDateEnd);
          if (filterStatus === 'Returned' || filterStatus === 'Cancelled') return isInRange(order.returnedAt, filterDateStart, filterDateEnd);
          // Status === 'All' -> Match if ANY relevant date is in range
          return isInRange(order.receivedAt, filterDateStart, filterDateEnd) || 
                 isInRange(order.pickedUpAt, filterDateStart, filterDateEnd) || 
                 isInRange(order.returnedAt, filterDateStart, filterDateEnd);
        }
        return true;
      })
      .filter(order => filterStatus === 'All' || order.status === filterStatus)
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [allFilteredOrders, filterStatus, filterDateStart, filterDateEnd]);
  
  // Calculate Pagination
  const totalPages = Math.ceil(orderList.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return orderList.slice(startIndex, startIndex + itemsPerPage);
  }, [orderList, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterTier, filterStatus, filterOutlet, filterDateStart, filterDateEnd, filterPaymentMethod, itemsPerPage]);

  // Summary by Outlet (calculated from already filtered data)
  const summaryByOutlet = useMemo(() => {
    const outlets = filterOutlet === 'All' ? ['eltalg', 'tegara', 'mostashfa'] : [filterOutlet];
    
    return outlets.map(outletName => {
      const outletOrders = allFilteredOrders.filter(o => normalizeOutlet(o.outlet) === outletName);
      
      const received = outletOrders.filter(o => isInRange(o.receivedAt, filterDateStart, filterDateEnd)).length;
      const delivered = outletOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt, filterDateStart, filterDateEnd)).length;
      const returned = outletOrders.filter(o => o.status === 'Returned' && isInRange(o.returnedAt, filterDateStart, filterDateEnd)).length;
      const cancelled = outletOrders.filter(o => o.status === 'Cancelled' && isInRange(o.returnedAt, filterDateStart, filterDateEnd)).length;
      const available = outletOrders.filter(o => o.status === 'Inventory' && isInRange(o.receivedAt, filterDateStart, filterDateEnd)).length;
      
      const totalMoney = outletOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt, filterDateStart, filterDateEnd)).reduce((sum, o) => sum + o.totalValue, 0);
      const paid = totalMoney; 
      
      const jumiaPay = outletOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt, filterDateStart, filterDateEnd) && o.paymentMethod?.toLowerCase().includes('jumia')).reduce((sum, o) => sum + o.totalValue, 0);
      const creditCard = outletOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt, filterDateStart, filterDateEnd) && (o.paymentMethod?.toLowerCase().includes('card') || o.paymentMethod?.toLowerCase().includes('visa'))).reduce((sum, o) => sum + o.totalValue, 0);

      const sCount = outletOrders.filter(o => o.status === 'Inventory' && o.size === 'S' && isInRange(o.receivedAt, filterDateStart, filterDateEnd)).length;
      const mCount = outletOrders.filter(o => o.status === 'Inventory' && o.size === 'M' && isInRange(o.receivedAt, filterDateStart, filterDateEnd)).length;
      const lCount = outletOrders.filter(o => o.status === 'Inventory' && o.size === 'L' && isInRange(o.receivedAt, filterDateStart, filterDateEnd)).length;

      const storageFees = outletOrders.filter(o => o.status === 'Inventory' && isInRange(o.receivedAt, filterDateStart, filterDateEnd)).reduce((sum, o) => sum + (o.penalty || 0), 0);

      return {
        outlet: outletName,
        received,
        delivered,
        returned,
        cancelled,
        available,
        totalMoney,
        paid,
        jumiaPay,
        creditCard,
        storageFees,
        sCount,
        mCount,
        lCount
      };
    });
  }, [allFilteredOrders, filterOutlet, filterDateStart, filterDateEnd]);

  const handleSimulateReceive = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone) return;
    
    receiveOrder({
      id: newOrder.id,
      customerPhone: newOrder.customerPhone,
      customerName: newOrder.customerName,
      description: newOrder.description,
      totalValue: Number(newOrder.totalValue),
      category: newOrder.category,
      outlet: newOrder.outlet,
      size: newOrder.size,
      paymentMethod: newOrder.paymentMethod
    });
    setShowSimulateModal(false);
    setNewOrder({ 
      id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '',
      outlet: user?.outlet || 'eltalg', size: 'M', paymentMethod: 'Cash'
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Inventory': return t('inventoryStatus');
      case 'Picked Up': return t('pickedUpStatus');
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
              <option value="Inventory">{t('inventoryStatus')}</option>
              <option value="Picked Up">{t('pickedUpStatus')}</option>
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
               <option value="Electronics">{language === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
               <option value="Apparel">{language === 'ar' ? 'ملابس' : 'Apparel'}</option>
               <option value="Home">{language === 'ar' ? 'منزل' : 'Home'}</option>
               <option value="Groceries">{language === 'ar' ? 'بقاليات' : 'Groceries'}</option>
            </select>

            <select className="input-field" style={{ flex: '1 1 120px' }} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
               <option value="All">{language === 'ar' ? 'جميع المستويات' : 'All Tiers'}</option>
               <option value="New">{t('newCustomer')}</option>
               <option value="Bronze">Bronze</option>
               <option value="Silver">Silver</option>
               <option value="Gold">Gold</option>
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
              {(filterDateStart || filterDateEnd || filterOutlet !== 'All' || searchTerm || filterStatus !== 'Inventory' || filterCategory !== 'All' || filterTier !== 'All' || filterPaymentMethod !== 'All') && (
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('Inventory');
                    setFilterOutlet('All');
                    setFilterCategory('All');
                    setFilterTier('All');
                    setFilterDateStart('');
                    setFilterDateEnd('');
                    setFilterPaymentMethod('All');
                  }}
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
                  <th>{language === 'ar' ? 'متاح' : 'Inventory'}</th>
                  <th>{language === 'ar' ? 'اجمالي' : 'Total'}</th>
                  <th>{language === 'ar' ? 'سداد' : 'Paid'}</th>
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
                    <td style={{ color: 'var(--color-success)' }}>{row.delivered}</td>
                    <td style={{ color: 'var(--color-warning)' }}>{row.cancelled}</td>
                    <td style={{ color: 'var(--color-danger)' }}>{row.returned}</td>
                    <td style={{ fontWeight: 700 }}>{row.available}</td>
                    <td>{row.totalMoney.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ fontWeight: 600 }}>{row.storageFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{row.sCount}</td>
                    <td>{row.mCount}</td>
                    <td>{row.lCount}</td>
                  </tr>
                ))}
                {/* Grand Total Row */}
                <tr style={{ background: 'rgba(var(--hue-primary), 80%, 65%, 0.1)', borderTop: '2px solid var(--color-primary)' }}>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{language === 'ar' ? 'الإجمالي' : 'GRAND TOTAL'}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.received, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.delivered, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.cancelled, 0)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.returned, 0)}</td>
                  <td style={{ fontWeight: 800 }}>{summaryByOutlet.reduce((sum, r) => sum + r.available, 0)}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.totalMoney, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ fontWeight: 700 }}>{summaryByOutlet.reduce((sum, r) => sum + r.paid, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{summaryByOutlet.reduce((sum, r) => sum + r.storageFees, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                <th>{t('orderId')}</th>
                <th>{t('customer')}</th>
                <th>{t('description')}</th>
                <th>{t('category')}</th>
                <th>{t('pickedFromJumia')}</th>
                <th>{t('status')}</th>
                <th>{t('pickedUpByCustomer')}</th>
                <th>{t('daysInInv')}</th>
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
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem' }}>{order.description}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{order.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       {order.category === 'Electronics' && <Gift size={14} color="#6366f1" />}
                       <span style={{ fontSize: '0.85rem' }}>{order.category}</span>
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
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{t('receiveNewOrder')}</h3>
            <form onSubmit={handleSimulateReceive}>
              <div className="input-group">
                <label className="input-label">{t('orderId')}</label>
                <input required className="input-field" value={newOrder.id} onChange={e => setNewOrder({...newOrder, id: e.target.value})} placeholder="e.g. ORD-9999" />
              </div>
              <div className="input-group">
                <label className="input-label">{t('phone')}</label>
                <input required className="input-field" value={newOrder.customerPhone} onChange={e => setNewOrder({...newOrder, customerPhone: e.target.value})} placeholder="01..." />
              </div>
              <div className="input-group">
                 <label className="input-label">{t('customer')}</label>
                 <input className="input-field" value={newOrder.customerName} onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} placeholder={t('name')} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('description')}</label>
                <input required className="input-field" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} placeholder="Items..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{language === 'ar' ? 'اجمالي الفلوس' : 'Total Value'}</label>
                  <input required type="number" step="0.01" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({...newOrder, totalValue: e.target.value})} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{t('category')}</label>
                  <select className="input-field" value={newOrder.category} onChange={e => setNewOrder({...newOrder, category: e.target.value})}>
                     <option value="Electronics">Electronics</option>
                     <option value="Apparel">Apparel</option>
                     <option value="Home">Home</option>
                     <option value="Groceries">Groceries</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('packageSize')}</label>
                <select className="input-field" value={newOrder.size} onChange={e => setNewOrder({...newOrder, size: e.target.value})}>
                  <option value="S">{t('small')}</option>
                  <option value="M">{t('medium')}</option>
                  <option value="L">{t('big')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSimulateModal(false)}>{t('cancel')}</button>
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
                    onChange={e => setEditingOrder({...editingOrder, category: e.target.value})}
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Apparel">Apparel</option>
                    <option value="Home">Home</option>
                    <option value="Groceries">Groceries</option>
                    <option value="General">General</option>
                  </select>
                </div>
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={async () => {
                    const res = await updateOrder(originalOrderId, {
                      newId: editingOrder.id,
                      customerPhone: editingOrder.customerPhone,
                      description: editingOrder.description,
                      totalValue: parseFloat(editingOrder.totalValue),
                      category: editingOrder.category,
                      outlet: editingOrder.outlet,
                      size: editingOrder.size,
                      paymentMethod: editingOrder.paymentMethod
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
              if (res.success) setShowReturnModal(false);
            }}>
              <div className="input-group">
                <label className="input-label">{t('phone')}</label>
                <input required className="input-field" value={newReturn.customerPhone} onChange={e => setNewReturn({...newReturn, customerPhone: e.target.value})} />
              </div>
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label className="input-label">{t('description')}</label>
                <textarea className="input-field" required value={newReturn.description} onChange={e => setNewReturn({...newReturn, description: e.target.value})} rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReturnModal(false)}>{t('cancel')}</button>
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


    </div>
  );
}
