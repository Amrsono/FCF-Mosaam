import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Banknote, AlertCircle } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function ParkedPenaltiesTab() {
  const { orders, customers, calculatePenalty } = useDashboard();
  const { t, language } = useLanguage();

  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: t('penaltyAmount'), accessor: 'penalty' }
  ];

  const penalizedOrders = orders
    .filter(o => o.status === 'Inventory')
    .map(o => {
       const cust = customers.find(c => c.phone === o.customerPhone);
       return {
         ...o,
         customerName: cust?.name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
         penalty: calculatePenalty(o),
         daysParked: getDaysDifference(o.receivedAt)
       };
    })
    .filter(o => o.penalty > 0)
    .sort((a, b) => b.penalty - a.penalty);

  const totalPenalties = penalizedOrders.reduce((acc, order) => acc + order.penalty, 0);

  const penaltiesFilteredView = (penalizedOrders) => {
    if (penalizedOrders.length === 0) {
      return (
        <tr>
          <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>{order.customerName}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
          </div>
        </td>
        <td>{new Date(order.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
        <td>
          <span className="badge badge-warning">{order.daysParked} {language === 'ar' ? 'أيام' : 'Days'}</span>
        </td>
        <td style={{ fontWeight: 600, color: 'var(--color-warning)', fontSize: '1.1rem' }}>
          {order.penalty} EGP
        </td>
      </tr>
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem' }}>
        <div style={{ flex: '1 1 200px' }}>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <Banknote size={24} color="var(--color-warning)" /> 
            {t('parkedPenalties')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {language === 'ar' ? 'مستحقة من الطلبات المخزنة (5 جنيه / اليوم)' : 'Accrued from orders parked (5 EGP / Day)'}
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

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('orderId')}</th>
              <th>{language === 'ar' ? 'معلومات العميل' : 'Customer Info'}</th>
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
