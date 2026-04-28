import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Plus, UserCheck, RefreshCw, Package, CreditCard, Gift, AlertCircle, CalendarClock, Clock } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function BostaTab() {
  const { bostaOrders, customers, receiveBostaOrder, markBostaOrderPickedUp, returnBostaOrder, updateCustomer } = useDashboard();
  const { t, language } = useLanguage();
  
  const getOutletLabel = (val) => {
    if (val === 'Banha 1') return t('banha1');
    if (val === 'Banha 2') return t('banha2');
    if (val === 'Banha 3') return t('banha3');
    return val;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Inventory');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterOutlet, setFilterOutlet] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [customerUpdateData, setCustomerUpdateData] = useState({ name: '', email: '', address: '', phone: '' });

  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', customerName: '', description: '', totalValue: '', category: 'Electronics', outlet: 'Banha 1'
  });

  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('description'), accessor: 'description' },
    { label: t('category'), accessor: 'category' },
    { label: language === 'ar' ? 'المنفذ' : 'Outlet', accessor: 'outlet' },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: t('value'), accessor: 'totalValue' },
    { label: t('status'), accessor: 'status' },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: 'SLA Status', accessor: o => o.daysParked >= 4 ? t('critical4Days') : o.daysParked >= 2 ? t('warning2Days') : t('onTrack') }
  ];

  const orderList = useMemo(() => {
    return bostaOrders.map(order => {
      const cust = customers.find(c => c.phone === order.customerPhone);
      const daysParked = order.status === 'Inventory' ? getDaysDifference(order.receivedAt) : 0;
      return {
        ...order,
        customerName: cust?.name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
        tier: cust?.tier || (language === 'ar' ? 'جديد' : 'New'),
        daysParked
      };
    }).filter(o => {
      const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            o.customerPhone.includes(searchTerm);
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchesCategory = filterCategory === 'All' || o.category === filterCategory;
      const matchesOutlet = filterOutlet === 'All' || (o.outlet || 'وبور الثلج') === filterOutlet;

      // Date Filter
      let matchesDate = true;
      if (filterDateStart || filterDateEnd) {
        const orderDate = new Date(o.receivedAt);
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

      return matchesSearch && matchesStatus && matchesCategory && matchesOutlet && matchesDate;
    }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [bostaOrders, customers, searchTerm, filterStatus, filterCategory, filterOutlet, filterDateStart, filterDateEnd, language]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone) return;
    receiveBostaOrder({
      id: newOrder.id,
      customerPhone: newOrder.customerPhone,
      customerName: newOrder.customerName,
      description: newOrder.description,
      totalValue: Number(newOrder.totalValue),
      category: newOrder.category,
      outlet: newOrder.outlet
    });
    setShowModal(false);
    setNewOrder({ id: '', customerPhone: '', customerName: '', description: '', totalValue: '', category: 'Electronics', outlet: 'وبور الثلج' });
  };

  const getSlaColor = (days) => {
    if (days >= 4) return 'var(--color-danger)';
    if (days >= 2) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getSlaLabel = (days) => {
    if (days >= 4) return t('critical4Days');
    if (days >= 2) return t('warning2Days');
    return t('onTrack');
  };

  // Calculates precise elapsed time label (hours if < 24h, else days)
  const getElapsedLabel = (receivedAt) => {
    const diffMs = Math.abs(new Date() - new Date(receivedAt));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) {
      return language === 'ar' ? `${diffHours} ساعة` : `${diffHours}h ago`;
    }
    return language === 'ar' ? `${diffDays} يوم` : `${diffDays}d ago`;
  };

  const getElapsedColor = (receivedAt) => {
    const diffMs = Math.abs(new Date() - new Date(receivedAt));
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 3) return 'var(--color-danger)';
    if (diffDays >= 1) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Inventory': return t('inventoryStatus');
      case 'Picked Up': return t('pickedUpStatus');
      case 'Returned': return t('returnedStatus');
      default: return status;
    }
  };

  const inventoryCount = bostaOrders.filter(o => o.status === 'Inventory').length;
  const pickedUpCount = bostaOrders.filter(o => o.status === 'Picked Up').length;
  const returnedCount = bostaOrders.filter(o => o.status === 'Returned').length;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* Header Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), transparent)', [language === 'ar' ? 'borderRight' : 'borderLeft']: '3px solid #6366f1', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('inventoryStatus')}</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{inventoryCount}</div>
        </div>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), transparent)', [language === 'ar' ? 'borderRight' : 'borderLeft']: '3px solid var(--color-success)', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('pickedUpStatus')}</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{pickedUpCount}</div>
        </div>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), transparent)', [language === 'ar' ? 'borderRight' : 'borderLeft']: '3px solid var(--color-danger)', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{language === 'ar' ? 'المرتجع لبوسطة' : 'Returned to Bosta'}</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-danger)' }}>{returnedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
              <option value="Banha 1">{t('banha1')}</option>
              <option value="Banha 2">{t('banha2')}</option>
              <option value="Banha 3">{t('banha3')}</option>
          </select>

          <select className="input-field" style={{ flex: '1 1 120px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
             <option value="All">{language === 'ar' ? 'جميع الفئات' : 'All Categories'}</option>
             <option value="Electronics">{language === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
             <option value="Apparel">{language === 'ar' ? 'ملابس' : 'Apparel'}</option>
             <option value="Home">{language === 'ar' ? 'منزل' : 'Home'}</option>
             <option value="Groceries">{language === 'ar' ? 'بقاليات' : 'Groceries'}</option>
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
            {(filterDateStart || filterDateEnd || filterOutlet !== 'All' || searchTerm || filterStatus !== 'Inventory' || filterCategory !== 'All') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('Inventory');
                  setFilterCategory('All');
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
        <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flex: '1 1 auto' }} onClick={() => setShowModal(true)}>
          <Plus size={18} /> {t('receiveBostaOrder')}
        </button>
      </div>

      {/* Export bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="badge badge-neutral">{language === 'ar' ? `عرض: ${orderList.length} طلب بوسطة` : `Showing: ${orderList.length} Bosta Orders`}</div>
        <ExportActions data={orderList} headers={exportHeaders} filename="Bosta_Orders_Export" title={t('bosta')} />
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{language === 'ar' ? 'رقم طلب بوسطة' : 'Bosta Order ID'}</th>
              <th>{t('customer')}</th>
              <th>{t('description')}</th>
              <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CalendarClock size={14} color="#6366f1" />
                  {language === 'ar' ? 'تاريخ ووقت الاستلام' : 'Date Received'}
                </div>
              </th>
              <th>{t('status')}</th>
              <th>{language === 'ar' ? 'معلومات SLA' : 'SLA / Days Parked'}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length > 0 ? orderList.map(order => (
              <tr key={order.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} color="#6366f1" />
                    <span style={{ fontWeight: 600 }}>{order.id}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                    <span className="badge badge-neutral" style={{ marginTop: '0.3rem', alignSelf: 'flex-start', fontSize: '0.65rem' }}>{t('tier')}: {order.tier}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.description}</span>
                    <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>{order.totalValue} EGP</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.category}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{getOutletLabel(order.outlet)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {/* Date line */}
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', letterSpacing: '0.01em' }}>
                      {new Date(order.receivedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'short', day: '2-digit' })}
                    </span>
                    {/* Time line */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Clock size={11} />
                      {new Date(order.receivedAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {/* Elapsed badge — only for inventory orders */}
                    {order.status === 'Inventory' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: `${getElapsedColor(order.receivedAt)}22`,
                        color: getElapsedColor(order.receivedAt),
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        alignSelf: 'flex-start',
                        border: `1px solid ${getElapsedColor(order.receivedAt)}44`
                      }}>
                        ⏱ {getElapsedLabel(order.receivedAt)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${order.status === 'Inventory' ? 'badge-warning' : order.status === 'Picked Up' ? 'badge-success' : 'badge-danger'}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>
                  {order.status === 'Inventory' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ color: getSlaColor(order.daysParked), fontWeight: 600 }}>{order.daysParked} {language === 'ar' ? 'أيام في المخزن' : 'Days Parked'}</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${getSlaColor(order.daysParked)}22`,
                        color: getSlaColor(order.daysParked),
                        padding: '0.1rem 0.5rem',
                        borderRadius: '999px',
                        alignSelf: 'flex-start'
                      }}>
                        {getSlaLabel(order.daysParked)}
                      </span>
                      {order.daysParked >= 4 && (
                        <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>{language === 'ar' ? '⚠ ينصح بالإرجاع لبوسطة' : '⚠ Return to Bosta recommended'}</span>
                      )}
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td>
                  {order.status === 'Inventory' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem', color: 'var(--color-success)' }}
                        title={t('markPickedUp')}
                        onClick={() => { 
                          const cust = customers.find(c => c.phone === order.customerPhone);
                          setCustomerUpdateData({
                            phone: cust?.phone || order.customerPhone,
                            name: cust?.name || '',
                            email: cust?.email || '',
                            address: cust?.address || ''
                          });
                          setPendingOrderId(order.id); 
                          setShowCrossSellModal(true); 
                        }}
                      >
                        <UserCheck size={16} />
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                        title={language === 'ar' ? 'إرجاع لبوسطة' : 'Return to Bosta'}
                        onClick={() => returnBostaOrder(order.id)}
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  {language === 'ar' ? 'لم يتم العثور على طلبات بوسطة. استلم طرداً للبدء.' : 'No Bosta orders found. Receive a package to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receive Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-main)', borderTop: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('receiveBostaOrder')}</h3>
              <Package color="#6366f1" size={24} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'رقم طلب بوسطة' : 'Bosta Order ID'}</label>
                <input required className="input-field" value={newOrder.id} onChange={e => setNewOrder({ ...newOrder, id: e.target.value })} placeholder="e.g. BST-001" />
              </div>
              <div className="input-group">
                <label className="input-label">{t('phone')}</label>
                <input required className="input-field" value={newOrder.customerPhone} onChange={e => setNewOrder({ ...newOrder, customerPhone: e.target.value })} placeholder="01..." />
              </div>
              <div className="input-group">
                <label className="input-label">{t('customer')}</label>
                <input className="input-field" value={newOrder.customerName} onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })} placeholder={t('name')} />
              </div>
              <div className="input-group">
                <label className="input-label">{t('description')}</label>
                <input required className="input-field" value={newOrder.description} onChange={e => setNewOrder({ ...newOrder, description: e.target.value })} placeholder="Items..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">{t('value')} (EGP)</label>
                  <input required type="number" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({ ...newOrder, totalValue: e.target.value })} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">{t('category')}</label>
                  <select className="input-field" value={newOrder.category} onChange={e => setNewOrder({ ...newOrder, category: e.target.value })}>
                     <option value="Electronics">{language === 'ar' ? 'إلكترونيات' : 'Electronics'}</option>
                     <option value="Apparel">{language === 'ar' ? 'ملابس' : 'Apparel'}</option>
                     <option value="Home">{language === 'ar' ? 'منزل' : 'Home'}</option>
                     <option value="Groceries">{language === 'ar' ? 'بقاليات' : 'Groceries'}</option>
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'المنفذ (فرع الاستلام)' : 'Outlet (Receiving Branch)'}</label>
                <select className="input-field" value={newOrder.outlet} onChange={e => setNewOrder({ ...newOrder, outlet: e.target.value })}>
                  <option value="Banha 1">{t('banha1')}</option>
                  <option value="Banha 2">{t('banha2')}</option>
                  <option value="Banha 3">{t('banha3')}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Cross-Sell Confirmation Modal */}
      {showCrossSellModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)', textAlign: 'center', border: '1px solid #6366f1' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--bg-overlay)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
               <CreditCard size={32} color="#6366f1" />
            </div>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{language === 'ar' ? 'عرض كارت ميزة (بوسطة)' : 'Meeza Card Offer (Bosta)'}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {language === 'ar' 
                ? 'هل قمت بعرض "كارت ميزة اللحظي" والخدمات المصرفية للبنك الأهلي على العميل قبل استلام طرد بوسطة؟' 
                : 'Did you offer the "Meeza Instant Card" and Ahly Bank services to the customer before Bosta pickup?'}
            </p>

            {/* Missing Data Fields */}
            <div className="glass-panel" style={{ background: 'var(--bg-overlay)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'right' }}>
               <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#6366f1' }}>
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
                 style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                 onClick={async () => {
                   if (updateCustomer) await updateCustomer(customerUpdateData);
                   markBostaOrderPickedUp(pendingOrderId);
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
                   markBostaOrderPickedUp(pendingOrderId);
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
  );
}
