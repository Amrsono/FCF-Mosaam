import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Banknote, AlertCircle } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function ParkedPenaltiesTab() {
  const { orders, bostaOrders, customers, calculatePenalty, globalFilters, updateFilters } = useDashboard();
  const { t, language } = useLanguage();

  const f = globalFilters.penalties || { source: 'all' };
  const filterSource = f.source;
  const setFilterSource = (val) => updateFilters('penalties', { source: val });
  
  const getOutletLabel = (val) => {
    if (val === 'eltalg') return t('eltalg');
    if (val === 'tegara') return t('tegara');
    if (val === 'mostashfa') return t('mostashfa');
    return val;
  };

  const normalizeOutlet = (val) => {
    if (!val) return 'eltalg';
    const v = String(val).toLowerCase().trim();
    if (v === 'eltalg' || v.includes('banha 1') || v.includes('banha1') || v.includes('ثلج') || v.includes('تلج')) return 'eltalg';
    if (v === 'tegara' || v.includes('banha 2') || v.includes('banha2') || v.includes('تجارة') || v.includes('تجاره')) return 'tegara';
    if (v === 'mostashfa' || v.includes('banha 3') || v.includes('banha3') || v.includes('مستشفى') || v.includes('مستشفي')) return 'mostashfa';
    return val;
  };

  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: language === 'ar' ? 'المصدر' : 'Source', accessor: o => o.orderSource === 'bosta' ? 'Bosta' : 'Jumia' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: language === 'ar' ? 'المنفذ' : 'Outlet', accessor: o => getOutletLabel(normalizeOutlet(o.outlet)) },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: language === 'ar' ? 'سعر اليوم' : 'Daily Rate', accessor: o => `${o.dailyRate} EGP` },
    { label: t('penaltyAmount'), accessor: o => `${o.penalty} EGP` }
  ];

  const buildPenalized = (orderSet, source) => 
    orderSet
      .filter(o => o.status === 'Inventory')
      .map(o => {
         const cust = customers.find(c => c.phone === o.customerPhone);
         const size = (o.size || 'M').toUpperCase();
         const dailyRate = size === 'S' ? 18 : size === 'L' ? 45 : 30;
         return {
           ...o,
           orderSource: source,
           outlet: normalizeOutlet(o.outlet),
           customerName: cust?.name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
           penalty: calculatePenalty(o),
           dailyRate,
           daysParked: getDaysDifference(o.receivedAt)
         };
      });

  const penalizedOrders = [
    ...(filterSource === 'all' || filterSource === 'jumia' ? buildPenalized(orders, 'jumia') : []),
    ...(filterSource === 'all' || filterSource === 'bosta' ? buildPenalized(bostaOrders, 'bosta') : [])
  ]
    .filter(o => o.penalty > 0)
    .sort((a, b) => b.penalty - a.penalty);

  const totalPenalties = penalizedOrders.reduce((acc, order) => acc + order.penalty, 0);

  const penaltiesFilteredView = (penalizedOrders) => {
    if (penalizedOrders.length === 0) {
      return (
        <tr>
          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
             <AlertCircle size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
             {language === 'ar' ? 'لا توجد غرامات نشطة في المخزون حالياً.' : 'No active penalties found across inventory.'}
          </td>
        </tr>
      );
    }

    return penalizedOrders.map(order => (
      <tr key={order.id}>
        <td style={{ fontWeight: 600 }}>{order.id}</td>
        <td>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem',
            borderRadius: '999px', background: order.orderSource === 'bosta' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.15)',
            color: order.orderSource === 'bosta' ? '#818cf8' : 'var(--color-warning)',
            border: `1px solid ${order.orderSource === 'bosta' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
            display: 'inline-flex', alignItems: 'center'
          }}>
            {order.orderSource === 'bosta' ? t('sourceBosta') : t('sourceJ')}
          </span>
        </td>
        <td>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{order.customerName}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
          </div>
        </td>
        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{getOutletLabel(order.outlet)}</td>
        <td>{new Date(order.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <span className="badge badge-warning">{order.daysParked} {language === 'ar' ? 'أيام' : 'Days'}</span>
        </td>
        <td style={{ fontWeight: 600, color: 'var(--color-warning)', fontSize: '1.1rem' }}>
          {order.penalty} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>EGP ({order.dailyRate}/day)</span>
        </td>
      </tr>
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem' }}>
        <div style={{ flex: '1 1 200px' }}>
          <h2 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Banknote size={24} color="var(--color-warning)" /> 
            {t('parkedPenalties')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {language === 'ar'
              ? 'أول 4 أيام مجانية — ثم S: 18 | M: 30 | L: 45 جنيه / اليوم'
              : 'First 4 days free — then S: 18 | M: 30 | L: 45 EGP / Day'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flex: '1 1 auto' }}>
          <div style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 700, color: 'var(--color-warning)', textShadow: '0 0 20px rgba(255, 180, 50, 0.4)', lineHeight: 1 }}>
            {totalPenalties} <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>EGP</span>
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <ExportActions data={penalizedOrders} headers={exportHeaders} filename="Pending_Penalties_Export" title={t('parkedPenalties')} />
          </div>
        </div>
      </div>
      
      {/* Source Filter Toggle */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        background: 'var(--bg-panel)', 
        borderRadius: 'var(--radius-md)', 
        padding: '0.4rem', 
        alignSelf: 'stretch', 
        border: '1px solid var(--border-color)', 
        flexWrap: 'wrap' 
      }}>
        <button
          className={`btn ${filterSource === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', flex: '1 1 auto', fontSize: '0.85rem' }}
          onClick={() => setFilterSource('all')}
        >
          {language === 'ar' ? 'الكل' : 'All'}
        </button>
        <button
          className={`btn ${filterSource === 'jumia' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', flex: '1 1 auto', fontSize: '0.85rem' }}
          onClick={() => setFilterSource('jumia')}
        >
          {language === 'ar' ? 'جوميا' : 'Jumia'}
        </button>
        <button
          className={`btn ${filterSource === 'bosta' ? 'btn-primary' : 'btn-outline'}`}
          style={{ 
            border: 'none', 
            flex: '1 1 auto', 
            fontSize: '0.85rem',
            ...(filterSource === 'bosta' ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {})
          }}
          onClick={() => setFilterSource('bosta')}
        >
          {language === 'ar' ? 'بوسطة' : 'Bosta'}
        </button>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('orderId')}</th>
              <th>{language === 'ar' ? 'المصدر' : 'Source'}</th>
              <th>{language === 'ar' ? 'معلومات العميل' : 'Customer Info'}</th>
              <th>{language === 'ar' ? 'المنفذ' : 'Outlet'}</th>
              <th>{t('receivedAt')}</th>
              <th>{t('daysInInv')}</th>
              <th>{t('penaltyAmount')}</th>
            </tr>
          </thead>
          <tbody>
            {penaltiesFilteredView(penalizedOrders)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
