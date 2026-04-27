import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Filter, Plus, UserCheck, RefreshCw, FileUp, CreditCard, Gift, AlertCircle, Flag, PackageX, RotateCcw, Check } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import ImportWizard from '../components/ImportWizard';
import { useLanguage } from '../context/LanguageContext';

export default function OrdersTab() {
  const { orders, customers, receiveOrder, bulkReceiveOrders, calculatePenalty, calculateStorageFee, markOrderPickedUp, returnOrder, updateCustomer, customerReturns, receiveCustomerReturn, markReturnedToJumia } = useDashboard();
  const { t, language } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Inventory');
  const [filterOutlet, setFilterOutlet] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [customerUpdateData, setCustomerUpdateData] = useState({ name: '', email: '', address: '', phone: '' });

  // Customer Returns state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFilterStatus, setReturnFilterStatus] = useState('At Station');
  const [newReturn, setNewReturn] = useState({
    orderId: '', customerPhone: '', customerName: '', description: '', reason: '', outlet: 'وبور الثلج'
  });

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '',
    outlet: 'وبور الثلج', size: 'M', paymentMethod: 'Cash'
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
    { label: t('status'), accessor: 'status' },
    { label: t('daysInInv'), accessor: 'daysParked' }
  ];

  const importTargetFields = [
    { key: 'id', label: t('orderId'), required: true },
    { key: 'customerPhone', label: t('phone'), required: true },
    { key: 'customerName', label: t('customer'), required: false },
    { key: 'description', label: t('description'), required: false },
    { key: 'totalValue', label: t('value'), required: true },
    { key: 'category', label: t('category'), required: false },
    { key: 'outlet', label: language === 'ar' ? 'المنفذ' : 'Outlet', required: false },
    { key: 'size', label: language === 'ar' ? 'المقاس' : 'Size', required: false },
    { key: 'paymentMethod', label: language === 'ar' ? 'طريقة الدفع' : 'Payment Method', required: false }
  ];

  // Derived Data (computed first so summaryByOutlet can consume it)
  const orderList = useMemo(() => {
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
      // Search
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            order.customerPhone.includes(searchTerm);
      // Category Filter
      const matchesCategory = filterCategory === 'All' || order.category === filterCategory;
      // Tier Filter
      const matchesTier = filterTier === 'All' || order.tier === filterTier;
      // Status Filter
      const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
      // Outlet Filter
      const matchesOutlet = filterOutlet === 'All' || (order.outlet || 'وبور الثلج') === filterOutlet;
      
      // Date Filter
      let matchesDate = true;
      if (filterDateStart || filterDateEnd) {
        const orderDate = new Date(order.receivedAt);
        orderDate.setHours(0, 0, 0, 0);
        
        if (filterDateStart) {
          const start = new Date(filterDateStart);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) matchesDate = false;
        }
        if (filterDateEnd) {
          const end = new Date(filterDateEnd);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) matchesDate = false;
        }
      }

      return matchesSearch && matchesCategory && matchesTier && matchesStatus && matchesOutlet && matchesDate;
    }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [orders, customers, searchTerm, filterCategory, filterTier, filterStatus, filterOutlet, filterDateStart, filterDateEnd, calculatePenalty, language]);

  // Aggregated Summary Data — derived from the already-filtered orderList
  const summaryByOutlet = useMemo(() => {
    const outlets = ['وبور الثلج', 'تجاره', 'المستشفى'];
    return outlets.map(outletName => {
      const outletOrders = orderList.filter(o => (o.outlet || "وبور الثلج") === outletName);
      const received = outletOrders.length;
      const delivered = outletOrders.filter(o => o.status === 'Picked Up').length;
      const returned = outletOrders.filter(o => o.status === 'Returned').length;
      const available = outletOrders.filter(o => o.status === 'Inventory').length;
      
      // Total Money: include all orders (except returned)
      const totalMoney = outletOrders.filter(o => o.status !== 'Returned').reduce((sum, o) => sum + o.totalValue, 0);
      
      // Paid: only picked up orders
      const paid = outletOrders.filter(o => o.status === 'Picked Up').reduce((sum, o) => sum + o.totalValue, 0);
      
      // JumiaPay: include all jumiapay orders
      const jumiaPay = outletOrders.filter(o => o.status !== 'Returned' && o.paymentMethod?.toLowerCase().includes('jumiapay')).reduce((sum, o) => sum + o.totalValue, 0);
      
      const sCount = outletOrders.filter(o => o.size === 'S').length;
      const mCount = outletOrders.filter(o => o.size === 'M').length;
      const lCount = outletOrders.filter(o => o.size === 'L').length;

      // Storage Fee is charged for every order received
      const storageFees = outletOrders.filter(o => o.status !== 'Returned').reduce((sum, o) => sum + calculateStorageFee(o), 0);
      const totalIncome = storageFees;

      return {
        outlet: outletName,
        received,
        delivered,
        returned,
        available,
        totalMoney,
        paid,
        jumiaPay,
        storageFees,
        totalIncome,
        sCount,
        mCount,
        lCount
      };
    });
  }, [orderList, calculateStorageFee]);

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
      outlet: 'وبور الثلج', size: 'M', paymentMethod: 'Cash'
    });
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Inventory': return t('inventoryStatus');
      case 'Picked Up': return t('pickedUpStatus');
      case 'Returned': return t('returnedStatus');
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
            <option value="Returned">{t('returnedStatus')}</option>
          </select>

          <select className="input-field" style={{ flex: '1 1 120px' }} value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}>
             <option value="All">{language === 'ar' ? 'جميع المنافذ' : 'All Outlets'}</option>
             <option value="وبور الثلج">وبور الثلج</option>
             <option value="تجاره">تجاره</option>
             <option value="المستشفى">المستشفى</option>
          </select>

          <select className="input-field" style={{ flex: '1 1 120px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
             <option value="All">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
             <option value="Electronics">{language === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
             <option value="Apparel">{language === 'ar' ? 'ملابس' : 'Apparel'}</option>
             <option value="Home">{language === 'ar' ? 'منزل' : 'Home'}</option>
             <option value="Groceries">{language === 'ar' ? 'بقاليات' : 'Groceries'}</option>
          </select>

          <select className="input-field" style={{ flex: '1 1 100px' }} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
             <option value="All">{language === 'ar' ? 'جميع المستويات' : 'All Tiers'}</option>
             <option value="New">{t('newCustomer')}</option>
             <option value="Bronze">Bronze</option>
             <option value="Silver">Silver</option>
             <option value="Gold">Gold</option>
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
            {(filterDateStart || filterDateEnd || filterOutlet !== 'All' || searchTerm || filterStatus !== 'Inventory' || filterCategory !== 'All' || filterTier !== 'All') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('Inventory');
                  setFilterCategory('All');
                  setFilterTier('All');
                  setFilterOutlet('All');
                  setFilterDateStart('');
                  setFilterDateEnd('');
                }}
                className="btn btn-outline" 
                style={{ padding: '0.4rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                title={language === 'ar' ? 'إعادة تعيين' : 'Reset Filters'}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => setShowImportWizard(true)} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)', flex: '1 1 auto' }}>
            <FileUp size={18} /> {t('importData')}
          </button>
          <button className="btn btn-primary" onClick={() => setShowSimulateModal(true)} style={{ flex: '1 1 auto' }}>
            <Plus size={18} /> {t('receiveNewOrder')}
          </button>
        </div>
      </div>

      {/* Summary Chips & Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
         <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
           <div className="badge badge-neutral">{language === 'ar' ? `عرض: ${orderList.length}` : `Showing: ${orderList.length}`}</div>
         </div>
         <ExportActions data={orderList} headers={exportHeaders} filename="Orders_Export" title={t('inventory')} />
      </div>

      {/* Inventory Summary Table */}
      <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ color: 'var(--color-primary)', marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>
          {language === 'ar' ? 'ملخص مخزون الطلبات' : 'Orders Inventory Summary'}
        </h4>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
                <th>{language === 'ar' ? 'تم استلام' : 'Received'}</th>
                <th>{language === 'ar' ? 'تم التسليم' : 'Delivered'}</th>
                <th>{language === 'ar' ? 'تم الالغاء' : 'Cancelled'}</th>
                <th style={{ color: 'var(--color-warning)' }}>{language === 'ar' ? 'متاح في المنفذ' : 'In Stock'}</th>
                <th>{language === 'ar' ? 'اجمالي الفلوس' : 'Total Money'}</th>
                <th>{language === 'ar' ? 'تم سداد' : 'Paid'}</th>
                <th> J  Pay</th>
                <th style={{ color: 'var(--color-primary)' }}>{language === 'ar' ? 'رسوم التخزين' : 'Storage Fees'}</th>
                <th style={{ color: 'var(--color-success)' }}>{language === 'ar' ? 'دخل المخزن' : 'WH Income'}</th>
                <th>S</th>
                <th>M</th>
                <th>L</th>
              </tr>
            </thead>
            <tbody>
              {summaryByOutlet.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: 'white' }}>{row.outlet}</td>
                  <td>{row.received}</td>
                  <td style={{ color: 'var(--color-success)' }}>{row.delivered}</td>
                  <td style={{ color: 'var(--color-danger)' }}>{row.returned}</td>
                  <td style={{ fontWeight: 700 }}>{row.available}</td>
                  <td>{row.totalMoney.toLocaleString()}</td>
                  <td>{row.paid.toLocaleString()}</td>
                  <td style={{ color: 'var(--color-primary)' }}>{row.jumiaPay.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{row.storageFees.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{row.totalIncome.toLocaleString()}</td>
                  <td>{row.sCount}</td>
                  <td>{row.mCount}</td>
                  <td>{row.lCount}</td>
                </tr>
              ))}
              <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 800 }}>
                <td>{language === 'ar' ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.received, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.delivered, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.returned, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.available, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.totalMoney, 0).toLocaleString()}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.paid, 0).toLocaleString()}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.jumiaPay, 0).toLocaleString()}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.storageFees, 0).toLocaleString()}</td>
                <td style={{ color: 'var(--color-success)' }}>{summaryByOutlet.reduce((s, r) => s + r.totalIncome, 0).toLocaleString()}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.sCount, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.mCount, 0)}</td>
                <td>{summaryByOutlet.reduce((s, r) => s + r.lCount, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('orderId')}</th>
              <th>{t('customer')}</th>
              <th>{t('description')}</th>
              <th>{t('status')}</th>
              <th>{language === 'ar' ? 'معلومات التوقف' : 'Parked Info'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length > 0 ? orderList.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.id}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                    <span className={`badge badge-neutral`} style={{ marginTop: '0.3rem', alignSelf: 'flex-start', fontSize: '0.65rem' }}>{t('tier')}: {order.tier}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.description}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 700 }}>{order.totalValue} EGP</span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{order.size}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.category} • {order.outlet}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${order.status === 'Inventory' ? 'badge-warning' : order.status === 'Picked Up' ? 'badge-success' : 'badge-danger'}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>
                  {order.status === 'Inventory' ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <span style={{ color: order.daysParked >= 4 ? 'var(--color-danger)' : 'inherit', fontWeight: order.daysParked >= 4 ? 800 : 400 }}>
                           {order.daysParked} {language === 'ar' ? 'أيام في المخزن' : 'Days Parked'}
                         </span>
                         {order.daysParked >= 4 && <Flag size={14} className="animate-pulse" color="var(--color-danger)" />}
                       </div>
                       {order.daysParked >= 4 && (
                         <div className="badge badge-danger" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                           {language === 'ar' ? 'يجب الارجاع' : 'RETURN REQ'}
                         </div>
                       )}
                     </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td>
                   {order.status === 'Inventory' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} title={t('markPickedUp')} onClick={() => { 
                          const cust = customers.find(c => c.phone === order.customerPhone);
                          setCustomerUpdateData({
                            phone: cust?.phone || order.customerPhone,
                            name: cust?.name || '',
                            email: cust?.email || '',
                            address: cust?.address || ''
                          });
                          setPendingOrderId(order.id); 
                          setShowCrossSellModal(true); 
                        }}>
                          <UserCheck size={16} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title={t('markReturned')} onClick={() => returnOrder(order.id)}>
                          <RefreshCw size={16} />
                        </button>
                      </div>
                   )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simple Modal Simulation */}
      {showSimulateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>{t('receiveNewOrder')}</h3>
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
                  <label className="input-label">{language === 'ar' ? 'اجمالي الفلوس (سعر البيع)' : 'Total Value (Selling Price)'} (EGP)</label>
                  <input required type="number" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({...newOrder, totalValue: e.target.value})} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{t('category')}</label>
                  <select className="input-field" value={newOrder.category} onChange={e => setNewOrder({...newOrder, category: e.target.value})}>
                     <option value="Electronics">{language === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
                     <option value="Apparel">{language === 'ar' ? 'ملابس' : 'Apparel'}</option>
                     <option value="Home">{language === 'ar' ? 'منزل' : 'Home'}</option>
                     <option value="Groceries">{language === 'ar' ? 'بقاليات' : 'Groceries'}</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{language === 'ar' ? 'المنفذ' : 'Outlet'}</label>
                  <select className="input-field" value={newOrder.outlet} onChange={e => setNewOrder({...newOrder, outlet: e.target.value})}>
                     <option value="وبور الثلج">وبور الثلج</option>
                     <option value="تجاره">تجاره</option>
                     <option value="المستشفى">المستشفى</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{language === 'ar' ? 'المقاس' : 'Size'}</label>
                  <select className="input-field" value={newOrder.size} onChange={e => setNewOrder({...newOrder, size: e.target.value})}>
                     <option value="S">S</option>
                     <option value="M">M</option>
                     <option value="L">L</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select className="input-field" value={newOrder.paymentMethod} onChange={e => setNewOrder({...newOrder, paymentMethod: e.target.value})}>
                     <option value="Cash">Cash</option>
                     <option value="JumiaPay"> J  Pay</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSimulateModal(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cross-Sell Confirmation Modal */}
      {showCrossSellModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)', textAlign: 'center', border: '1px solid var(--color-primary)' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
               <CreditCard size={32} color="var(--color-primary)" />
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'white' }}>{language === 'ar' ? 'عرض كارت ميزة' : 'Meeza Card Offer'}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {language === 'ar' 
                ? 'هل قمت بعرض "كارت ميزة اللحظي" والخدمات المصرفية للبنك الأهلي على العميل قبل الاستلام؟' 
                : 'Did you offer the "Meeza Instant Card" and Ahly Bank services to the customer before pickup?'}
            </p>

            {/* Missing Data Fields */}
            <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'right' }}>
               <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                 {language === 'ar' ? 'تحديث بيانات العميل' : 'Update Customer Data'}
               </h4>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>{t('name')}</label>
                    <input 
                      className="input-field" 
                      style={{ fontSize: '0.85rem', borderColor: !customerUpdateData.name ? 'var(--color-warning)' : '' }} 
                      value={customerUpdateData.name} 
                      onChange={e => setCustomerUpdateData({...customerUpdateData, name: e.target.value})} 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                    <input 
                      className="input-field" 
                      style={{ fontSize: '0.85rem', borderColor: !customerUpdateData.email ? 'var(--color-warning)' : '' }} 
                      value={customerUpdateData.email} 
                      onChange={e => setCustomerUpdateData({...customerUpdateData, email: e.target.value})} 
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ fontSize: '0.75rem' }}>{language === 'ar' ? 'العنوان' : 'Address'}</label>
                    <input 
                      className="input-field" 
                      style={{ fontSize: '0.85rem', borderColor: !customerUpdateData.address ? 'var(--color-warning)' : '' }} 
                      value={customerUpdateData.address} 
                      onChange={e => setCustomerUpdateData({...customerUpdateData, address: e.target.value})} 
                    />
                  </div>
               </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <button 
                 className="btn btn-primary" 
                 style={{ width: '100%', padding: '1rem' }}
                 onClick={async () => {
                   if (updateCustomer) await updateCustomer(customerUpdateData);
                   markOrderPickedUp(pendingOrderId);
                   setShowCrossSellModal(false);
                   setPendingOrderId(null);
                 }}
               >
                 {language === 'ar' ? 'نعم، تم العرض (تأكيد الاستلام)' : 'Yes, Offered (Confirm Pickup)'}
               </button>
               
               <button 
                 className="btn btn-outline" 
                 style={{ width: '100%' }}
                 onClick={() => {
                   markOrderPickedUp(pendingOrderId);
                   setShowCrossSellModal(false);
                   setPendingOrderId(null);
                 }}
               >
                 {language === 'ar' ? 'تخطي والعرض لاحقاً' : 'Skip and Offer Later'}
               </button>
               
               <button 
                 className="btn btn-outline" 
                 style={{ width: '100%', border: 'none', color: 'var(--text-muted)' }}
                 onClick={() => {
                   setShowCrossSellModal(false);
                   setPendingOrderId(null);
                 }}
               >
                 {t('cancel')}
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
        borderTop: '3px solid #a855f7'
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
              data={(customerReturns || []).filter(r => returnFilterStatus === 'All' || r.status === returnFilterStatus)}
              headers={[
                { label: t('orderId'), accessor: 'orderId' },
                { label: t('customer'), accessor: 'customerName' },
                { label: t('phone'), accessor: 'customerPhone' },
                { label: t('description'), accessor: 'description' },
                { label: t('returnReason'), accessor: 'reason' },
                { label: t('receivedAt'), accessor: r => new Date(r.receivedAt).toLocaleString() },
                { label: t('status'), accessor: r => r.status === 'At Station' ? t('atStation') : t('returnedToJumia') },
                { label: language === 'ar' ? 'تاريخ الارجاع لـ J' : 'Returned to J Date', accessor: r => r.returnedAt ? new Date(r.returnedAt).toLocaleString() : '-' }
              ]}
              filename="Customer_Returns_Export"
              title={t('customerReturns')}
            />
            <button className="btn btn-outline" style={{ color: '#a855f7', borderColor: 'rgba(168,85,247,0.4)', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setShowReturnModal(true)}>
              <PackageX size={16} /> {t('receiveCustomerReturn')}
            </button>
          </div>
        </div>

        {/* Pending count badge */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span className="badge badge-warning" style={{ fontSize: '0.8rem' }}>
            {t('pendingReturns')}: {(customerReturns || []).filter(r => r.status === 'At Station').length}
          </span>
        </div>

        {/* Customer Returns Table */}
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(168,85,247,0.08)' }}>
                <th>{t('orderId')}</th>
                <th>{t('customer')}</th>
                <th>{t('description')}</th>
                <th>{t('returnReason')}</th>
                <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
                <th>{t('receivedAt')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(customerReturns || []).filter(r => returnFilterStatus === 'All' || r.status === returnFilterStatus).length > 0 ?
                (customerReturns || []).filter(r => returnFilterStatus === 'All' || r.status === returnFilterStatus).map(ret => (
                  <tr key={ret.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{ret.orderId || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{ret.customerName}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ret.customerPhone}</span>
                      </div>
                    </td>
                    <td>{ret.description}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{ret.reason || '-'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ret.outlet || 'وبور الثلج'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(ret.receivedAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${ret.status === 'At Station' ? 'badge-warning' : 'badge-success'}`}>
                        {ret.status === 'At Station' ? t('atStation') : t('returnedToJumia')}
                      </span>
                      {ret.returnedAt && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(ret.returnedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td>
                      {ret.status === 'At Station' && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--color-success)', borderColor: 'rgba(34,197,94,0.3)', gap: '0.3rem' }}
                          onClick={() => markReturnedToJumia(ret.id)}
                          title={t('markReturnedToJumia')}
                        >
                          <Check size={14} /> {t('markReturnedToJumia')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <PackageX size={30} style={{ margin: '0 auto 0.5rem', opacity: 0.4, display: 'block' }} />
                    {language === 'ar' ? 'لا توجد مرتجعات عملاء.' : 'No customer returns found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Return Modal */}
      {showReturnModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-main)', borderTop: '3px solid #a855f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={20} color="#a855f7" /> {t('receiveCustomerReturn')}
              </h3>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newReturn.customerPhone || !newReturn.description) return;
              const res = await receiveCustomerReturn(newReturn);
              if (res.success) {
                setShowReturnModal(false);
                setNewReturn({ orderId: '', customerPhone: '', customerName: '', description: '', reason: '', outlet: 'وبور الثلج' });
              } else {
                alert(res.error || 'Failed to save');
              }
            }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 180px' }}>
                  <label className="input-label">{t('orderId')} ({language === 'ar' ? 'اختياري' : 'Optional'})</label>
                  <input className="input-field" value={newReturn.orderId} onChange={e => setNewReturn({...newReturn, orderId: e.target.value})} placeholder="e.g. ORD-1234" />
                </div>
                <div className="input-group" style={{ flex: '1 1 180px' }}>
                  <label className="input-label">{t('phone')} *</label>
                  <input required className="input-field" value={newReturn.customerPhone} onChange={e => setNewReturn({...newReturn, customerPhone: e.target.value})} placeholder="01..." />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('customer')}</label>
                <input className="input-field" value={newReturn.customerName} onChange={e => setNewReturn({...newReturn, customerName: e.target.value})} placeholder={t('name')} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('description')} *</label>
                <input required className="input-field" value={newReturn.description} onChange={e => setNewReturn({...newReturn, description: e.target.value})} placeholder={language === 'ar' ? 'وصف المنتج...' : 'Product description...'} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('returnReason')}</label>
                <input className="input-field" value={newReturn.reason} onChange={e => setNewReturn({...newReturn, reason: e.target.value})} placeholder={language === 'ar' ? 'منتج تالف، خطأ في الطلب...' : 'Damaged, wrong item...'} />
              </div>
              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'المنفذ (فرع الاستلام)' : 'Outlet (Receiving Branch)'}</label>
                <select className="input-field" value={newReturn.outlet} onChange={e => setNewReturn({...newReturn, outlet: e.target.value})}>
                  <option value="وبور الثلج">وبور الثلج</option>
                  <option value="تجاره">تجاره</option>
                  <option value="المستشفى">المستشفى</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReturnModal(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Wizard */}
      <ImportWizard 
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        targetFields={importTargetFields}
        onImport={bulkReceiveOrders}
        title={language === 'ar' ? 'استيراد طلبات  J ' : 'Import  J  Orders'}
      />

    </div>
  );
}
