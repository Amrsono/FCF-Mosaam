import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Edit2, Save, X, Plus, UserPlus } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';

export default function CustomersTab() {
  const { customers, orders, bostaOrders, updateCustomer, addCustomer } = useDashboard();
  const { t, language } = useLanguage();
  
  const [editingPhone, setEditingPhone] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    phone: '', name: '', email: '', address: '', tier: 'New'
  });
  const [error, setError] = useState('');

  const exportHeaders = [
    { label: t('phone'), accessor: 'phone' },
    { label: t('name'), accessor: 'name' },
    { label: t('email'), accessor: 'email' },
    { label: t('address'), accessor: 'address' },
    { label: t('tier'), accessor: 'tier' },
    { label: t('deliveries'), accessor: c => orders.filter(o => o.customerPhone === c.phone).length },
    { label: t('bostaDeliveries'), accessor: c => bostaOrders.filter(o => o.customerPhone === c.phone).length },
    { label: t('total'), accessor: c => 
      orders.filter(o => o.customerPhone === c.phone).length + 
      bostaOrders.filter(o => o.customerPhone === c.phone).length 
    }
  ];

  const startEdit = (customer) => {
    setEditingPhone(customer.phone);
    setEditForm({ ...customer });
  };

  const handleSave = () => {
    updateCustomer(editingPhone, editForm);
    setEditingPhone(null);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await addCustomer(newCustomer);
    if (res.success) {
      setShowAddModal(false);
      setNewCustomer({ phone: '', name: '', email: '', address: '', tier: 'New' });
    } else {
      setError(res.error || (language === 'ar' ? 'فشل إضافة العميل' : 'Failed to add customer'));
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, flex: '1 1 100%' }}>{t('customerDirectory')}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
          <div className="badge badge-primary">{t('total')}: {customers.length}</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setShowAddModal(true); setError(''); }} style={{ flex: '1 1 auto' }}>
              <UserPlus size={18} /> {t('addCustomer')}
            </button>
            <ExportActions data={customers} headers={exportHeaders} filename="Customers_Export" title={t('customerDirectory')} />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('phone')}</th>
              <th>{t('name')}</th>
              <th>{t('email')}</th>
              <th>{t('address')}</th>
              <th>{t('tier')}</th>
              <th>{t('deliveries')}</th>
              <th>{t('bostaDeliveries')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? customers.map(customer => {
              const isEditing = editingPhone === customer.phone;
              return (
                <tr key={customer.phone}>
                  <td style={{ fontWeight: 600 }}>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '110px' }} value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                    ) : customer.phone}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '120px' }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    ) : customer.name}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '150px' }} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder={t('email')} />
                    ) : customer.email || <span style={{ color: 'var(--color-danger)' }}>{language === 'ar' ? 'مفقود' : 'Missing'}</span>}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '180px' }} value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder={t('address')} />
                    ) : customer.address || <span style={{ color: 'var(--color-danger)' }}>{language === 'ar' ? 'مفقود' : 'Missing'}</span>}
                  </td>
                  <td>
                    {isEditing ? (
                      <select className="input-field" style={{ padding: '0.4rem' }} value={editForm.tier} onChange={e => setEditForm({ ...editForm, tier: e.target.value })}>
                        <option value="New">{t('newCustomer')}</option>
                        <option value="Bronze">Bronze</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                      </select>
                    ) : (
                      <span className="badge badge-neutral">{customer.tier === 'New' ? t('newCustomer') : customer.tier}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                        {orders.filter(o => o.customerPhone === customer.phone).length}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'جوميا' : 'Jumia'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>
                        {bostaOrders.filter(o => o.customerPhone === customer.phone).length}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'بوسطة' : 'Bosta'}</span>
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} onClick={handleSave}><Save size={16} /></button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} onClick={() => setEditingPhone(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => startEdit(customer)}><Edit2 size={16} /></button>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>{t('noData')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-main)', border: '1px solid var(--color-primary)' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.25rem' }}>
              <UserPlus color="var(--color-primary)" /> {t('addCustomer')}
            </h2>
            
            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '1rem', width: '100%', padding: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 200px' }}>
                  <label className="input-label">{t('phone')}</label>
                  <input required className="input-field" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="01..." />
                </div>
                <div className="input-group" style={{ flex: '1 1 200px' }}>
                  <label className="input-label">{t('name')}</label>
                  <input required className="input-field" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder={t('name')} />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">{t('email')} ({language === 'ar' ? 'اختياري' : 'Optional'})</label>
                <input type="email" className="input-field" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="customer@example.com" />
              </div>

              <div className="input-group">
                <label className="input-label">{t('address')}</label>
                <input className="input-field" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Area, Street, Building..." />
              </div>

              <div className="input-group">
                <label className="input-label">{t('loyaltyTier')}</label>
                <select className="input-field" value={newCustomer.tier} onChange={e => setNewCustomer({...newCustomer, tier: e.target.value})}>
                  <option value="New">{t('newCustomer')}</option>
                  <option value="Bronze">Bronze</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('confirm')}</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
