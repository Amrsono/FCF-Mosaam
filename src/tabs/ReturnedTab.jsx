import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { RefreshCcw, PackageX } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function ReturnedTab() {
  const { orders, customers } = useDashboard();
  const { t, language } = useLanguage();
  
  const exportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('customer'), accessor: 'customerName' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('value'), accessor: 'totalValue' },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleDateString() },
    { label: t('returnedStatus'), accessor: o => o.returnedAt ? new Date(o.returnedAt).toLocaleDateString() : 'N/A' },
    { label: t('daysInInv'), accessor: 'daysParkedFinal' }
  ];

  // Filter for returned orders
  const returnedOrders = orders
    .filter(o => o.status === 'Returned')
    .map(o => {
      const cust = customers.find(c => c.phone === o.customerPhone);
      return {
        ...o,
        customerName: cust?.name || (language === 'ar' ? 'غير معروف' : 'Unknown'),
        daysParkedFinal: o.returnedAt 
          ? Math.floor(Math.abs(new Date(o.returnedAt) - new Date(o.receivedAt)) / (1000 * 60 * 60 * 24))
          : getDaysDifference(o.receivedAt)
      };
    })
    .sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(var(--hue-primary), 15%, 10%, 0.5))', flexWrap: 'wrap', gap: '1.5rem', padding: '1.5rem' }}>
        <div style={{ flex: '1 1 200px' }}>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
            <RefreshCcw size={24} color="var(--color-danger)" /> 
            {language === 'ar' ? 'مرتجعات المستودع' : 'Warehouse Returns'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {language === 'ar' ? 'الطلبات التي تم إرجاعها نهائياً بعد انتهاء فترة SLA.' : 'Orders permanently returned after SLA expiration.'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flex: '1 1 auto' }}>
          <div style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 700, color: 'var(--color-danger)', lineHeight: 1 }}>
            {returnedOrders.length} <span style={{ fontSize: '0.5em', color: 'var(--text-muted)' }}>{language === 'ar' ? 'طلب' : 'Items'}</span>
          </div>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
            <ExportActions data={returnedOrders} headers={exportHeaders} filename="Returned_Orders_Export" title={t('returnedStatus')} />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('orderId')}</th>
              <th>{t('customer')}</th>
              <th>{t('value')}</th>
              <th>{t('receivedAt')}</th>
              <th>{language === 'ar' ? 'تاريخ الإرجاع' : 'Returned On'}</th>
              <th>{t('daysInInv')}</th>
            </tr>
          </thead>
          <tbody>
            {returnedOrders.length > 0 ? returnedOrders.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.id}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.totalValue} EGP</td>
                <td>{new Date(order.receivedAt).toLocaleDateString()}</td>
                <td>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                    {order.returnedAt ? new Date(order.returnedAt).toLocaleDateString() : '-'}
                  </span>
                </td>
                <td><span className="badge badge-neutral">{order.daysParkedFinal} {language === 'ar' ? 'أيام' : 'Days'}</span></td>
              </tr>
            )) : (
               <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                   <PackageX size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                   {language === 'ar' ? 'لم يتم تسجيل طلبات مرتجعة بعد.' : 'No returned orders logged yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
