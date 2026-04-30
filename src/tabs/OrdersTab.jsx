import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Plus, UserCheck, RefreshCw, FileUp, CreditCard, Gift, AlertCircle, Flag, PackageX, RotateCcw, Check, Pencil } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function OrdersTab() {
  const { orders, customers, receiveOrder, calculatePenalty, calculateStorageFee, markOrderPickedUp, returnOrder, updateCustomer, customerReturns, receiveCustomerReturn, markReturnedToJumia, updateOrder } = useDashboard();
  const { t, language } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Inventory');
  const [filterOutlet, setFilterOutlet] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [customerUpdateData, setCustomerUpdateData] = useState({ name: '', email: '', address: '', phone: '' });

  // Customer Returns state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnFilterStatus, setReturnFilterStatus] = useState('At Station');
  const [newReturn, setNewReturn] = useState({
    orderId: '', customerPhone: '', customerName: '', description: '', reason: '', outlet: 'Banha 1'
  });

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '',
    outlet: 'Banha 1', size: 'M', paymentMethod: 'Cash'
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
    { label: t('daysInInv'), accessor: 'daysParked' }
  ];

  const getOutletLabel = (val) => {
    if (val === 'Banha 1' || val === 'وبور الثلج' || val === 'وبور التلج') return t('banha1');
    if (val === 'Banha 2' || val === 'تجارة' || val === 'تجاره') return t('banha2');
    if (val === 'Banha 3' || val === 'المستشفي' || val === 'المستشفى') return t('banha3');
    return val;
  };

  const normalizeOutlet = (val) => {
    if (!val || val === 'وبور الثلج' || val === 'وبور التلج') return 'Banha 1';
    if (val === 'تجارة' || val === 'تجاره') return 'Banha 2';
    if (val === 'المستشفي' || val === 'المستشفى') return 'Banha 3';
    return val;
  };

  // Stage 1: Filter by everything EXCEPT status
  const baseFilteredOrders = useMemo(() => {
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
      return matchesSearch && matchesCategory && matchesTier && matchesOutlet && matchesDate;
    });
  }, [orders, customers, searchTerm, filterCategory, filterTier, filterOutlet, filterDateStart, filterDateEnd, calculatePenalty, language]);

  // Stage 2: Final list for display
  const orderList = useMemo(() => {
    return baseFilteredOrders
      .filter(order => filterStatus === 'All' || order.status === filterStatus)
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [baseFilteredOrders, filterStatus]);

  // Summary Data
  const summaryByOutlet = useMemo(() => {
    const outlets = ['Banha 1', 'Banha 2', 'Banha 3'];
    return outlets.map(outletName => {
      const outletOrders = baseFilteredOrders.filter(o => normalizeOutlet(o.outlet) === outletName);
      const received = outletOrders.length;
      const delivered = outletOrders.filter(o => o.status === 'Picked Up').length;
      const returned = outletOrders.filter(o => o.status === 'Returned').length;
      const available = outletOrders.filter(o => o.status === 'Inventory').length;
      const totalMoney = outletOrders.filter(o => o.status !== 'Returned').reduce((sum, o) => sum + o.totalValue, 0);
      const paid = outletOrders.filter(o => o.status === 'Picked Up').reduce((sum, o) => sum + o.totalValue, 0);
      const jumiaPay = outletOrders.filter(o => o.status !== 'Returned' && o.paymentMethod?.toLowerCase().includes('jumia')).reduce((sum, o) => sum + o.totalValue, 0);
      const creditCard = outletOrders.filter(o => o.status !== 'Returned' && (o.paymentMethod?.toLowerCase().includes('card') || o.paymentMethod?.toLowerCase().includes('visa'))).reduce((sum, o) => sum + o.totalValue, 0);
      const sCount = outletOrders.filter(o => o.size === 'S').length;
      const mCount = outletOrders.filter(o => o.size === 'M').length;
      const lCount = outletOrders.filter(o => o.size === 'L').length;
      const storageFees = outletOrders.filter(o => o.status !== 'Returned').reduce((sum, o) => sum + calculateStorageFee(o), 0);
      return { outlet: outletName, received, delivered, returned, available, totalMoney, paid, jumiaPay, creditCard, storageFees, totalIncome: storageFees, sCount, mCount, lCount };
    });
  }, [baseFilteredOrders, calculateStorageFee]);

  const handleSimulateReceive = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone) return;
    receiveOrder({ ...newOrder, totalValue: Number(newOrder.totalValue) });
    setShowSimulateModal(false);
    setNewOrder({ id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '', outlet: 'Banha 1', size: 'M', paymentMethod: 'Cash' });
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
      
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 300px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '250px', flex: '1 1 200px' }}>
               <Search size={18} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '10px', top: '10px', color: 'var(--text-muted)' }} />
               <input type="text" className="input-field" placeholder={t('search')} style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.5rem', width: '100%' }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="input-field" style={{ flex: '1 1 140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="All">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
              <option value="Inventory">{t('inventoryStatus')}</option>
              <option value="Picked Up">{t('pickedUpStatus')}</option>
              <option value="Returned">{t('returnedStatus')}</option>
            </select>
            <select className="input-field" style={{ flex: '1 1 120px' }} value={filterOutlet} onChange={e => setFilterOutlet(e.target.value)}>
               <option value="All">{language === 'ar' ? 'جميع المنافذ' : 'All Outlets'}</option>
               <option value="Banha 1">{t('banha1')}</option>
               <option value="Banha 2">{t('banha2')}</option>
               <option value="Banha 3">{t('banha3')}</option>
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: '1 1 300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="date" className="input-field" style={{ fontSize: '0.8rem' }} value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} />
              </div>
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <div style={{ position: 'relative', flex: 1 }}>
                <input type="date" className="input-field" style={{ fontSize: '0.8rem' }} value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} />
              </div>
              {(filterDateStart || filterDateEnd || filterOutlet !== 'All' || searchTerm || filterStatus !== 'Inventory') && (
                <button onClick={() => { setSearchTerm(''); setFilterStatus('Inventory'); setFilterOutlet('All'); setFilterDateStart(''); setFilterDateEnd(''); }} className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }}><RotateCcw size={16} /></button>
              )}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowSimulateModal(true)}><Plus size={18} /> {t('receiveNewOrder')}</button>
        </div>

        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
                <th>{language === 'ar' ? 'استلام' : 'Rec'}</th>
                <th>{language === 'ar' ? 'تسليم' : 'Del'}</th>
                <th>{language === 'ar' ? 'الغاء' : 'Can'}</th>
                <th>{language === 'ar' ? 'متاح' : 'Stock'}</th>
                <th>{language === 'ar' ? 'اجمالي' : 'Total'}</th>
                <th>{language === 'ar' ? 'سداد' : 'Paid'}</th>
                <th>Fees</th>
              </tr>
            </thead>
            <tbody>
              {summaryByOutlet.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700 }}>{getOutletLabel(row.outlet)}</td>
                  <td>{row.received}</td>
                  <td>{row.delivered}</td>
                  <td>{row.returned}</td>
                  <td>{row.available}</td>
                  <td>{row.totalMoney.toLocaleString()}</td>
                  <td>{row.paid.toLocaleString()}</td>
                  <td>{row.storageFees.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-container" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('orderId')}</th>
                <th>{t('customer')}</th>
                <th>{t('description')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {orderList.map(order => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.id}</td>
                  <td>{order.customerName}<br/><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span></td>
                  <td>{order.description}<br/><span style={{ color: 'var(--color-primary)' }}>{order.totalValue} EGP</span></td>
                  <td><span className={`badge ${order.status === 'Inventory' ? 'badge-warning' : 'badge-success'}`}>{getStatusLabel(order.status)}</span></td>
                  <td>
                    {order.status === 'Inventory' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-primary)' }} onClick={() => setEditingOrder(order)}><Pencil size={16} /></button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} onClick={() => { setPendingOrderId(order.id); setShowCrossSellModal(true); }}><UserCheck size={16} /></button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} onClick={() => returnOrder(order.id)}><RefreshCw size={16} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-panel" style={{ background: 'var(--bg-overlay)', borderTop: '3px solid #a855f7', marginTop: '1rem' }}>
        <h4 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><RotateCcw size={20} color="#a855f7" /> {t('customerReturns')}</h4>
        <div className="table-container">
          <table className="data-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>{t('orderId')}</th>
                <th>{t('customer')}</th>
                <th>{t('description')}</th>
                <th>{t('status')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {(customerReturns || []).map(ret => (
                <tr key={ret.id}>
                  <td>{ret.orderId}</td>
                  <td>{ret.customerName}</td>
                  <td>{ret.description}</td>
                  <td><span className={`badge ${ret.status === 'At Station' ? 'badge-warning' : 'badge-success'}`}>{ret.status}</span></td>
                  <td>{ret.status === 'At Station' && <button className="btn btn-outline" onClick={() => markReturnedToJumia(ret.id)}><Check size={14} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline" style={{ color: '#a855f7', marginTop: '1rem' }} onClick={() => setShowReturnModal(true)}><PackageX size={16} /> {t('receiveCustomerReturn')}</button>
      </div>

      {showSimulateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <h3>{t('receiveNewOrder')}</h3>
            <form onSubmit={handleSimulateReceive}>
              <input required className="input-field" placeholder={t('orderId')} value={newOrder.id} onChange={e => setNewOrder({...newOrder, id: e.target.value})} />
              <input required className="input-field" placeholder={t('phone')} value={newOrder.customerPhone} onChange={e => setNewOrder({...newOrder, customerPhone: e.target.value})} />
              <input className="input-field" placeholder={t('customer')} value={newOrder.customerName} onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
              <input required className="input-field" placeholder={t('description')} value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} />
              <input required type="number" className="input-field" placeholder="Value" value={newOrder.totalValue} onChange={e => setNewOrder({...newOrder, totalValue: e.target.value})} />
              <select className="input-field" value={newOrder.outlet} onChange={e => setNewOrder({...newOrder, outlet: e.target.value})}><option value="Banha 1">Banha 1</option><option value="Banha 2">Banha 2</option><option value="Banha 3">Banha 3</option></select>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button><button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSimulateModal(false)}>{t('cancel')}</button></div>
            </form>
          </div>
        </div>
      )}

      {editingOrder && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <h3>{t('editOrder')}</h3>
            <div className="form-group">
              <label>{t('description')}</label>
              <textarea className="input-field" value={editingOrder.description} onChange={e => setEditingOrder({...editingOrder, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>{t('value')}</label>
              <input type="number" className="input-field" value={editingOrder.totalValue} onChange={e => setEditingOrder({...editingOrder, totalValue: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => { await updateOrder(editingOrder.id, editingOrder); setEditingOrder(null); }}>{t('confirm')}</button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditingOrder(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showCrossSellModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '450px', textAlign: 'center' }}>
            <CreditCard size={32} color="var(--color-primary)" />
            <h3>{t('meezaOffer')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={() => { markOrderPickedUp(pendingOrderId); setShowCrossSellModal(false); }}>{t('confirm')}</button>
              <button className="btn btn-outline" onClick={() => setShowCrossSellModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {showReturnModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '440px' }}>
            <h3>{t('receiveCustomerReturn')}</h3>
            <form onSubmit={async (e) => { e.preventDefault(); await receiveCustomerReturn(newReturn); setShowReturnModal(false); }}>
              <input required className="input-field" placeholder={t('phone')} value={newReturn.customerPhone} onChange={e => setNewReturn({...newReturn, customerPhone: e.target.value})} />
              <input required className="input-field" placeholder={t('description')} value={newReturn.description} onChange={e => setNewReturn({...newReturn, description: e.target.value})} />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}><button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button><button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowReturnModal(false)}>{t('cancel')}</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
