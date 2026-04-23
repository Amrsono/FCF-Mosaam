import React, { useState } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { AlertTriangle, ShieldCheck, Clock, RefreshCcw, Package } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function SLATab() {
  const { orders, returnOrder, bostaOrders, returnBostaOrder } = useDashboard();
  const { t, language } = useLanguage();
  const [activeSource, setActiveSource] = useState('jumia'); // 'jumia' | 'bosta'

  const buildSlaList = (orderSet) =>
    orderSet
      .filter(o => o.status === 'Inventory')
      .map(o => {
        const days = getDaysDifference(o.receivedAt);
        let slaStatus = 'green';
        if (days >= 4) slaStatus = 'red';
        else if (days >= 2) slaStatus = 'orange';
        return { ...o, daysParked: days, slaStatus };
      })
      .sort((a, b) => b.daysParked - a.daysParked);

  const jumiaInventory = buildSlaList(orders);
  const bostaInventory = buildSlaList(bostaOrders);
  const inventoryOrders = activeSource === 'jumia' ? jumiaInventory : bostaInventory;
  const handleReturn = activeSource === 'jumia' ? returnOrder : returnBostaOrder;

  const jumiaExportHeaders = [
    { label: t('orderId'), accessor: 'id' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: t('status'), accessor: o => o.slaStatus.toUpperCase() }
  ];

  const bostaExportHeaders = [
    { label: language === 'ar' ? 'رقم طلب بوسطة' : 'Bosta Order ID', accessor: 'id' },
    { label: t('phone'), accessor: 'customerPhone' },
    { label: t('receivedAt'), accessor: o => new Date(o.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) },
    { label: t('daysInInv'), accessor: 'daysParked' },
    { label: t('status'), accessor: o => o.slaStatus.toUpperCase() }
  ];

  const getSlaCardStyle = (status) => {
    switch (status) {
      case 'red': return { [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--color-danger)', background: language === 'ar' ? 'linear-gradient(270deg, rgba(239,68,68,0.12), transparent)' : 'linear-gradient(90deg, rgba(239,68,68,0.12), transparent)' };
      case 'orange': return { [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--color-warning)', background: language === 'ar' ? 'linear-gradient(270deg, rgba(245,158,11,0.12), transparent)' : 'linear-gradient(90deg, rgba(245,158,11,0.12), transparent)' };
      case 'green': return { [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--color-success)', background: language === 'ar' ? 'linear-gradient(270deg, rgba(34,197,94,0.12), transparent)' : 'linear-gradient(90deg, rgba(34,197,94,0.12), transparent)' };
      default: return {};
    }
  };

  const SlaStats = ({ list }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(34,197,94,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <ShieldCheck size={24} color="var(--color-success)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'green').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{t('onTrack')} (0-1 {language === 'ar' ? 'أيام' : 'Days'})</div>
        </div>
      </div>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(245,158,11,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <Clock size={24} color="var(--color-warning)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'orange').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{language === 'ar' ? 'تأخير' : 'Delayed'} (2-3 {language === 'ar' ? 'أيام' : 'Days'})</div>
        </div>
      </div>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(239,68,68,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <AlertTriangle size={24} color="var(--color-danger)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'red').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{t('critical4Days')}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* Source Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', alignSelf: 'stretch', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeSource === 'jumia' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', gap: '0.5rem', flex: '1 1 auto' }}
          onClick={() => setActiveSource('jumia')}
        >
          <Package size={16} /> {language === 'ar' ? 'SLA لـ J ' : ' J  SLA'}
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}>{jumiaInventory.length}</span>
        </button>
        <button
          className={`btn ${activeSource === 'bosta' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', gap: '0.5rem', flex: '1 1 auto', ...(activeSource === 'bosta' ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}) }}
          onClick={() => setActiveSource('bosta')}
        >
          <Package size={16} /> {language === 'ar' ? 'SLA لبوسطة' : 'Bosta SLA'}
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}>{bostaInventory.length}</span>
        </button>
      </div>

      <SlaStats list={inventoryOrders} />

      {/* Timeline */}
      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>
            {language === 'ar' ? `الجدول الزمني لـ ${activeSource === 'jumia' ? ' J ' : 'بوسطة'}` : `${activeSource === 'jumia' ? ' J ' : 'Bosta'} Tracking Timeline`}
          </h3>
          <ExportActions
            data={inventoryOrders}
            headers={activeSource === 'jumia' ? jumiaExportHeaders : bostaExportHeaders}
            filename={`${activeSource === 'jumia' ? ' J ' : 'Bosta'}_SLA_Export`}
            title={t('slaMonitoring')}
          />
        </div>

        {inventoryOrders.map(order => (
          <div key={order.id} style={{ ...getSlaCardStyle(order.slaStatus), padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: '1 1 200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{order.id}</span>
                <span className={`badge badge-${order.slaStatus === 'red' ? 'danger' : order.slaStatus === 'orange' ? 'warning' : 'success'}`}>
                  {order.daysParked} {language === 'ar' ? 'أيام في المخزن' : 'Days Parked'}
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>{t('receivedAt')}: {new Date(order.receivedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              {order.slaStatus === 'orange' && <span style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>{language === 'ar' ? '⚠ تواصل مع العميل بشكل عاجل.' : '⚠ Contact customer urgently.'}</span>}
              {order.slaStatus === 'red' && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{language === 'ar' ? '🚨 انتهت فترة السماح! ينصح بالإرجاع.' : '🚨 Grace period expired! Return recommended.'}</span>}
            </div>
            {order.slaStatus === 'red' && (
              <button className="btn btn-danger" style={{ flex: '1 1 auto', justifyContent: 'center' }} onClick={() => handleReturn(order.id)}>
                <RefreshCcw size={16} /> {language === 'ar' ? 'إرجاع الطلب' : 'Return Order'}
              </button>
            )}
          </div>
        ))}

        {inventoryOrders.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {language === 'ar' ? `لا توجد طلبات لـ ${activeSource === 'jumia' ? ' J ' : 'بوسطة'} قيد التتبع حالياً.` : `No ${activeSource === 'jumia' ? ' J ' : 'Bosta'} inventory currently tracked for SLA.`}
          </div>
        )}
      </div>
    </div>
  );
}
