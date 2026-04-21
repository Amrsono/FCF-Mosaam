import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Filter, Plus, UserCheck, RefreshCw, FileUp } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import ImportWizard from '../components/ImportWizard';
import { useLanguage } from '../context/LanguageContext';

export default function OrdersTab() {
  const { orders, customers, receiveOrder, bulkReceiveOrders, calculatePenalty, markOrderPickedUp, returnOrder } = useDashboard();
  const { t, language } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Inventory');

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '',
    outlet: 'وبور الثلج', size: 'M', paymentMethod: 'Cash', orderCost: ''
  });

  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('description'), accessor: 'description' },
    { label: t('category'), accessor: 'category' },
    { label: t('value'), accessor: 'totalValue' },
    { label: language === 'ar' ? 'المنفذ' : 'Outlet', accessor: 'outlet' },
    { label: language === 'ar' ? 'المقاس' : 'Size', accessor: 'size' },
    { label: t('status'), accessor: 'status' },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: t('penalty'), accessor: 'penalty' },
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
    { key: 'paymentMethod', label: language === 'ar' ? 'طريقة الدفع' : 'Payment Method', required: false },
    { key: 'orderCost', label: language === 'ar' ? 'ثمن الأوردر' : 'Order Cost', required: false }
  ];

  // Aggregated Summary Data
  const summaryByOutlet = useMemo(() => {
    const outlets = ['وبور الثلج', 'تجاره', 'المستشفى'];
    return outlets.map(outletName => {
      const outletOrders = orders.filter(o => (o.outlet || "وبور الثلج") === outletName);
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
      
      // Net After Cost: Total Money - Total Cost
      const totalCost = outletOrders.filter(o => o.status !== 'Returned').reduce((sum, o) => sum + (o.orderCost || 0), 0);
      const netAfterCost = totalMoney - totalCost;
      
      const sCount = outletOrders.filter(o => o.size === 'S').length;
      const mCount = outletOrders.filter(o => o.size === 'M').length;
      const lCount = outletOrders.filter(o => o.size === 'L').length;

      return {
        outlet: outletName,
        received,
        delivered,
        returned,
        available,
        totalMoney,
        paid,
        jumiaPay,
        netAfterCost,
        sCount,
        mCount,
        lCount
      };
    });
  }, [orders]);

  // Derived Data
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

      return matchesSearch && matchesCategory && matchesTier && matchesStatus;
    }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [orders, customers, searchTerm, filterCategory, filterTier, filterStatus, calculatePenalty, language]);

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
      paymentMethod: newOrder.paymentMethod,
      orderCost: Number(newOrder.orderCost)
    });
    setShowSimulateModal(false);
    setNewOrder({ 
      id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '',
      outlet: 'وبور الثلج', size: 'M', paymentMethod: 'Cash', orderCost: ''
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
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
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
           <div className="badge badge-warning">{t('totalPenalties')}: {orderList.reduce((acc, o) => acc + (o.penalty || 0), 0)} EGP</div>
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
                <th>jumiapay</th>
                <th style={{ color: 'var(--color-success)' }}>{language === 'ar' ? 'صافي الأرباح' : 'Net After Cost'}</th>
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
                  <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{row.netAfterCost.toLocaleString()}</td>
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
                <td>{summaryByOutlet.reduce((s, r) => s + r.netAfterCost, 0).toLocaleString()}</td>
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
                       <span style={{ color: order.daysParked >= 4 ? 'var(--color-danger)' : 'inherit' }}>{order.daysParked} {language === 'ar' ? 'أيام في المخزن' : 'Days Parked'}</span>
                       <span style={{ fontWeight: 600, color: order.penalty > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>{order.penalty} EGP {t('penalty')}</span>
                     </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td>
                   {order.status === 'Inventory' && (
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} title={t('markPickedUp')} onClick={() => markOrderPickedUp(order.id)}>
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
                     <option value="JumiaPay">JumiaPay</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">{language === 'ar' ? 'ثمن الأوردر (سعر الشراء)' : 'Order Cost (Purchase Price)'}</label>
                  <input type="number" className="input-field" value={newOrder.orderCost} onChange={e => setNewOrder({...newOrder, orderCost: e.target.value})} placeholder="0.00" />
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

      {/* Import Wizard */}
      <ImportWizard 
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        targetFields={importTargetFields}
        onImport={bulkReceiveOrders}
        title={language === 'ar' ? 'استيراد طلبات جوميا' : 'Import Jumia Orders'}
      />

    </div>
  );
}
