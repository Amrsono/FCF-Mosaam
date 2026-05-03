import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Smartphone, Wifi, Zap, Building2, CreditCard, BookOpen, Banknote } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function BasataTab() {
  const { basataTransactions, logBasataService } = useDashboard();
  const { t, language } = useLanguage();
  
  const [showModal, setShowModal] = useState(false);
  const [activeService, setActiveService] = useState(null); // { category, provider }
  
  const [formData, setFormData] = useState({ 
    amount: '', 
    transactionId: '', 
    paymentMethod: 'Cash',
    percentage: '0',
    performedAt: '' 
  });

  const exportHeaders = [
    { label: t('transactionId'), accessor: 'transactionId' },
    { label: t('category'), accessor: 'category' },
    { label: t('serviceProvider'), accessor: 'serviceProvider' },
    { label: t('amount'), accessor: 'amount' },
    { label: t('percentage'), accessor: 'percentage' },
    { label: t('paymentMethod'), accessor: 'paymentMethod' },
    { label: t('date'), accessor: o => new Date(o.performedAt).toLocaleString() }
  ];

  const QUICK_ACTIONS = [
    { provider: language === 'ar' ? 'شحن فودافون' : 'Vodafone Top-up', category: 'Telecommunications', color: '#e60000', icon: <Smartphone size={24} /> },
    { provider: language === 'ar' ? 'شحن أورانج' : 'Orange Top-up', category: 'Telecommunications', color: '#ff6600', icon: <Smartphone size={24} /> },
    { provider: language === 'ar' ? 'شحن اتصالات' : 'Etisalat Top-up', category: 'Telecommunications', color: '#009900', icon: <Smartphone size={24} /> },
    { provider: language === 'ar' ? 'شحن وي' : 'WE Top-up', category: 'Telecommunications', color: '#6600cc', icon: <Smartphone size={24} /> },
  ];

  const SERVICE_CATEGORIES = [
    {
      title: language === 'ar' ? 'الإنترنت والاتصالات' : 'Internet & Comm',
      icon: <Wifi size={20} color="var(--color-primary)" />,
      services: language === 'ar' ? ['وي ADSL', 'أورانج DSL', 'اتصالات VDSL', 'فودافون DSL'] : ['WE ADSL', 'Orange DSL', 'Etisalat VDSL', 'Vodafone DSL']
    },
    {
      title: language === 'ar' ? 'المرافق العامة' : 'Public Utilities',
      icon: <Zap size={20} color="var(--color-warning)" />,
      services: language === 'ar' ? ['كهرباء (NFC/كارت)', 'فاتورة مياه', 'فاتورة غاز'] : ['Electricity (NFC/Card)', 'Water Bill', 'Gas Bill']
    },
    {
      title: language === 'ar' ? 'التعليم' : 'Education',
      icon: <BookOpen size={20} color="var(--color-success)" />,
      services: language === 'ar' ? ['مصاريف مدارس حكومية', 'مصاريف جامعات'] : ['Public School Fees', 'University Fees']
    },
    {
      title: language === 'ar' ? 'خدمات حكومية' : 'Government Services',
      icon: <Building2 size={20} color="var(--color-danger)" />,
      services: language === 'ar' ? ['مخالفات مرور', 'تأمينات اجتماعية', 'ضرائب عقارية'] : ['Traffic Fines (Niyaba)', 'Social Insurance', 'Real Estate Tax']
    },
    {
      title: t('bankingAndCash'),
      icon: <Banknote size={20} color="var(--color-primary)" />,
      services: [t('cashDeposit'), t('cashWithdrawal')]
    }
  ];

  const handleOpenModal = (category, provider) => {
    setActiveService({ category, provider });
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    
    setFormData({ 
      amount: '', 
      transactionId: '', 
      paymentMethod: 'Cash',
      percentage: '0',
      performedAt: localISOTime
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    const result = await logBasataService(activeService.category, activeService.provider, parseFloat(formData.amount), {
      transactionId: formData.transactionId,
      paymentMethod: formData.paymentMethod,
      percentage: parseFloat(formData.percentage),
      performedAt: formData.performedAt ? new Date(formData.performedAt).toISOString() : undefined
    });

    if (result.success) {
      setShowModal(false);
    } else {
      alert(t('errorLogging') + ": " + (result.error || "Unknown error"));
    }
  };

  const getPaymentMethodLabel = (method) => {
    switch (method) {
      case 'Cash': return t('cash');
      case 'Card': return t('card');
      case 'Wallet': return t('wallet');
      case 'Other': return t('other');
      default: return method;
    }
  };

  const totalRevenue = basataTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', [language === 'ar' ? 'paddingLeft' : 'paddingRight']: '1rem' }}>
      
      {/* 1. Quick Actions Bar */}
      <div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} color="var(--color-warning)" /> {t('popularQuickActions')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {QUICK_ACTIONS.map(action => (
            <button 
              key={action.provider}
              className="glass-panel" 
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', [language === 'ar' ? 'borderRight' : 'borderLeft']: `4px solid ${action.color}`, transition: 'transform 0.2s', padding: '1rem' }}
              onClick={() => handleOpenModal(action.category, action.provider)}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ color: action.color }}>{action.icon}</div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{action.provider}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Full Service Categories */}
      <div>
         <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>{t('allServiceCategories')}</h3>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
           {SERVICE_CATEGORIES.map(cat => (
             <div key={cat.title} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  {cat.icon}
                  <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>{cat.title}</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cat.services.map(svc => (
                    <button 
                      key={svc} 
                      className="btn btn-outline" 
                      style={{ justifyContent: 'flex-start', border: '1px solid var(--border-color)' }}
                      onClick={() => handleOpenModal(cat.title, svc)}
                    >
                      {svc}
                    </button>
                  ))}
                </div>
             </div>
           ))}
         </div>
      </div>

      {/* 3. Reports Section */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
           <div style={{ flex: '1 1 200px' }}>
             <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('transactionReport')}</h3>
             <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>
                {language === 'ar' ? 'سجل كامل لخدمات POS التي تم معالجتها.' : 'Full history of processed POS services.'}
             </p>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flex: '1 1 auto' }}>
              <div style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', fontWeight: 600, color: 'var(--color-primary)', textAlign: 'right' }}>
                {t('totalVolume')}: {totalRevenue.toLocaleString()} EGP
              </div>
              <ExportActions data={basataTransactions} headers={exportHeaders} filename="Basata_POS_Transactions" title={t('basata')} />
           </div>
         </div>

         <div className="table-container">
           <table className="data-table">
             <thead>
               <tr>
                 <th>{t('date')}</th>
                 <th>{t('transactionId')}</th>
                 <th>{t('service')}</th>
                 <th>{t('method')}</th>
                 <th>{t('amount')}</th>
                 <th>%</th>
               </tr>
             </thead>
             <tbody>
               {basataTransactions.length > 0 ? basataTransactions.map(t => (
                 <tr key={t.id}>
                   <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(t.performedAt).toLocaleString()}</td>
                   <td style={{ fontFamily: 'monospace' }}>{t.transactionId || '-'}</td>
                   <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.serviceProvider}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.category}</div>
                   </td>
                   <td><span className="badge badge-neutral">{getPaymentMethodLabel(t.paymentMethod)}</span></td>
                   <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{t.amount} EGP</td>
                   <td style={{ color: 'var(--text-secondary)' }}>{t.percentage}%</td>
                 </tr>
               )) : (
                 <tr>
                   <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noData')}</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>{t('logPosTransaction')}</h3>
               <CreditCard color="var(--color-primary)" />
            </div>
            
            <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', [language === 'ar' ? 'borderRight' : 'borderLeft']: '4px solid var(--color-primary)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t('serviceProvider')}</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>{activeService.provider}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{activeService.category}</div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{t('transactionId')}</label>
                  <input className="input-field" value={formData.transactionId} onChange={e => setFormData({...formData, transactionId: e.target.value})} placeholder="e.g. 938291" />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('paymentMethod')}</label>
                  <select className="input-field" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                    <option value="Cash">{t('cash')}</option>
                    <option value="Card">{t('card')}</option>
                    <option value="Wallet">{t('wallet')}</option>
                    <option value="Other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{language === 'ar' ? 'التاريخ والوقت (قابل للتعديل)' : 'Date & Time (Adjustable)'}</label>
                <input type="datetime-local" className="input-field" value={formData.performedAt} onChange={e => setFormData({...formData, performedAt: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label className="input-label">{t('amount')} (EGP)</label>
                  <input required autoFocus type="number" step="0.01" className="input-field" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label className="input-label">{t('percentage')}</label>
                  <input type="number" step="0.1" className="input-field" value={formData.percentage} onChange={e => setFormData({...formData, percentage: e.target.value})} placeholder="0" />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirmLogging')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
