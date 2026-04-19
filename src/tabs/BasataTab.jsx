import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Smartphone, Wifi, Zap, Building2, CreditCard, Droplets, BookOpen, Car } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Transaction ID', accessor: 'id' },
  { label: 'Category', accessor: 'category' },
  { label: 'Service Provider', accessor: 'serviceProvider' },
  { label: 'Amount (EGP)', accessor: 'amount' },
  { label: 'Reference Number', accessor: o => o.referenceNumber || 'N/A' },
  { label: 'Date/Time', accessor: o => new Date(o.performedAt).toLocaleString() }
];

export default function BasataTab() {
  const { basataTransactions, logBasataService } = useDashboard();
  
  const [showModal, setShowModal] = useState(false);
  const [activeService, setActiveService] = useState(null); // { category, provider }
  
  const [formData, setFormData] = useState({ amount: '', referenceNumber: '' });

  const QUICK_ACTIONS = [
    { provider: 'Vodafone Top-up', category: 'Telecommunications', color: '#e60000', icon: <Smartphone size={24} /> },
    { provider: 'Orange Top-up', category: 'Telecommunications', color: '#ff6600', icon: <Smartphone size={24} /> },
    { provider: 'Etisalat Top-up', category: 'Telecommunications', color: '#009900', icon: <Smartphone size={24} /> },
    { provider: 'WE Top-up', category: 'Telecommunications', color: '#6600cc', icon: <Smartphone size={24} /> },
  ];

  const SERVICE_CATEGORIES = [
    {
      title: 'Internet & Comm',
      icon: <Wifi size={20} color="var(--color-primary)" />,
      services: ['WE ADSL', 'Orange DSL', 'Etisalat VDSL', 'Vodafone DSL']
    },
    {
      title: 'Public Utilities',
      icon: <Zap size={20} color="var(--color-warning)" />,
      services: ['Electricity (NFC/Card)', 'Water Bill', 'Gas Bill']
    },
    {
      title: 'Education',
      icon: <BookOpen size={20} color="var(--color-success)" />,
      services: ['Public School Fees', 'University Fees']
    },
    {
      title: 'Government Services',
      icon: <Building2 size={20} color="var(--color-danger)" />,
      services: ['Traffic Fines (Niyaba)', 'Social Insurance', 'Real Estate Tax']
    }
  ];

  const handleOpenModal = (category, provider) => {
    setActiveService({ category, provider });
    setFormData({ amount: '', referenceNumber: '' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    logBasataService(activeService.category, activeService.provider, parseFloat(formData.amount), formData.referenceNumber);
    setShowModal(false);
  };

  const totalRevenue = basataTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto', paddingRight: '1rem' }}>
      
      {/* 1. Quick Actions Bar */}
      <div>
        <h3 style={{ color: 'white', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={20} color="var(--color-warning)" /> Popular Quick Actions (Mobile Top-ups)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {QUICK_ACTIONS.map(action => (
            <button 
              key={action.provider}
              className="glass-panel" 
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderLeft: `4px solid ${action.color}`, transition: 'transform 0.2s', padding: '1rem' }}
              onClick={() => handleOpenModal(action.category, action.provider)}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ color: action.color }}>{action.icon}</div>
              <span style={{ fontWeight: 600, color: 'white' }}>{action.provider}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Full Service Categories */}
      <div>
         <h3 style={{ color: 'white', marginBottom: '1rem' }}>All Service Categories</h3>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
           {SERVICE_CATEGORIES.map(cat => (
             <div key={cat.title} className="glass-panel" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  {cat.icon}
                  <h4 style={{ color: 'white', margin: 0 }}>{cat.title}</h4>
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
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem' }}>
           <div>
             <h3 style={{ color: 'white', margin: 0 }}>Transactions Report</h3>
             <p style={{ color: 'var(--text-secondary)', margin: '0.2rem 0 0 0', fontSize: '0.85rem' }}>Full history of processed POS services.</p>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>Total Volume: {totalRevenue.toLocaleString()} EGP</div>
              <ExportActions data={basataTransactions} headers={exportHeaders} filename="Basata_POS_Transactions" title="Basata POS Report" />
           </div>
         </div>

         <div className="table-container">
           <table className="data-table">
             <thead>
               <tr>
                 <th>Date / Time</th>
                 <th>Category</th>
                 <th>Service Provider</th>
                 <th>Reference #</th>
                 <th>Amount</th>
               </tr>
             </thead>
             <tbody>
               {basataTransactions.length > 0 ? basataTransactions.map(t => (
                 <tr key={t.id}>
                   <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(t.performedAt).toLocaleString()}</td>
                   <td><span className="badge badge-neutral">{t.category}</span></td>
                   <td style={{ fontWeight: 600, color: 'white' }}>{t.serviceProvider}</td>
                   <td style={{ fontFamily: 'monospace' }}>{t.referenceNumber || '-'}</td>
                   <td style={{ fontWeight: 700, color: 'var(--color-success)' }}>{t.amount} EGP</td>
                 </tr>
               )) : (
                 <tr>
                   <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No transactions processed yet.</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', background: 'var(--bg-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <h3 style={{ color: 'white', margin: 0 }}>Log POS Transaction</h3>
               <CreditCard color="var(--color-primary)" />
            </div>
            
            <div style={{ background: 'var(--bg-panel)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Service Provider</div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>{activeService.provider}</div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Amount (EGP)</label>
                <input required autoFocus type="number" step="0.01" className="input-field" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
              </div>
              <div className="input-group">
                 <label className="input-label">Receipt / Reference Number (Optional)</label>
                 <input className="input-field" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} placeholder="e.g. TR-938291" />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Confirm Logging</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
