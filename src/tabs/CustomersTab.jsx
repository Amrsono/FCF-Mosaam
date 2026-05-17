import React, { useState, useMemo, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Edit2, Save, X, Plus, UserPlus } from 'lucide-react';
import ExportActions from '../components/ExportActions';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function CustomersTab() {
  const { customers, orders, bostaOrders, updateCustomer, addCustomer } = useDashboard();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const normalizePhone = (phone) => {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\D/g, '').replace(/^0+/, ''); 
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned;
  };

  const normalizeOutlet = (val) => {
    if (!val) return 'eltalg';
    const v = String(val).toLowerCase().trim();
    if (v === 'eltalg' || v.includes('banha 1') || v.includes('banha1') || v.includes('ثلج') || v.includes('تلج')) return 'eltalg';
    if (v === 'tegara' || v.includes('banha 2') || v.includes('banha2') || v.includes('تجارة') || v.includes('تجاره')) return 'tegara';
    if (v === 'mostashfa' || v.includes('banha 3') || v.includes('banha3') || v.includes('مستشفى') || v.includes('مستشفي')) return 'mostashfa';
    return val;
  };

  const customerOutletsMap = useMemo(() => {
    const map = new Map();
    
    orders.forEach(order => {
      const phone = normalizePhone(order.customerPhone);
      if (!phone) return;
      const outlet = normalizeOutlet(order.outlet);
      if (!map.has(phone)) {
        map.set(phone, new Set());
      }
      map.get(phone).add(outlet);
    });

    bostaOrders.forEach(order => {
      const phone = normalizePhone(order.customerPhone);
      if (!phone) return;
      const outlet = normalizeOutlet(order.outlet);
      if (!map.has(phone)) {
        map.set(phone, new Set());
      }
      map.get(phone).add(outlet);
    });

    return map;
  }, [orders, bostaOrders]);
  
  const [editingPhone, setEditingPhone] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    phone: '', name: '', email: '', address: '', tier: 'New', gender: 'Unknown'
  });
  const [error, setError] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [outletFilter, setOutletFilter] = useState('All');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setOutletFilter(normalizeOutlet(user.outlet || 'eltalg'));
    }
  }, [user]);

  const filterOutlet = user?.role === 'admin' ? outletFilter : normalizeOutlet(user?.outlet || 'eltalg');

  const exportHeaders = [
    { label: t('phone'), accessor: 'phone' },
    { label: t('name'), accessor: 'name' },
    { label: t('email'), accessor: 'email' },
    { label: t('address'), accessor: 'address' },
    { label: language === 'ar' ? 'النوع' : 'Gender', accessor: 'gender' },
    { label: t('tier'), accessor: 'tier' },
    { label: t('deliveries'), accessor: c => orders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(c.phone)).length },
    { label: t('bostaDeliveries'), accessor: c => bostaOrders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(c.phone)).length },
    { label: t('total'), accessor: c => 
      orders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(c.phone)).length + 
      bostaOrders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(c.phone)).length 
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
  const filteredCustomers = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      c.phone.includes(search) || 
      c.name.toLowerCase().includes(search) || 
      (c.email || '').toLowerCase().includes(search) || 
      (c.address || '').toLowerCase().includes(search);
    
    const matchesGender = genderFilter === 'All' || c.gender === genderFilter;
    const matchesTier = tierFilter === 'All' || c.tier === tierFilter;
    
    const customerPhonesWithOutlet = customerOutletsMap.get(normalizePhone(c.phone));
    const matchesOutlet = filterOutlet === 'All' || (customerPhonesWithOutlet && customerPhonesWithOutlet.has(filterOutlet));
    
    return matchesSearch && matchesGender && matchesTier && matchesOutlet;
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, flex: '1 1 100%' }}>{t('customerDirectory')}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="badge badge-primary">{t('total')}: {filteredCustomers.length} / {customers.length}</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => { setShowAddModal(true); setError(''); }}>
                <UserPlus size={18} /> {t('addCustomer')}
              </button>
              <ExportActions data={filteredCustomers} headers={exportHeaders} filename="Customers_Export" title={t('customerDirectory')} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="input-group" style={{ flex: '1 1 300px' }}>
              <input 
                className="input-field" 
                placeholder={language === 'ar' ? 'البحث بالهاتف، الاسم، الإيميل...' : 'Search by phone, name, email...'} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select className="input-field" style={{ width: 'auto' }} value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                <option value="All">{language === 'ar' ? 'كل الأنواع' : 'All Genders'}</option>
                <option value="Male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                <option value="Female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
                <option value="Unknown">{language === 'ar' ? 'غير معروف' : 'Unknown'}</option>
              </select>

              <select className="input-field" style={{ width: 'auto' }} value={tierFilter} onChange={e => setTierFilter(e.target.value)}>
                <option value="All">{language === 'ar' ? 'كل الفئات' : 'All Tiers'}</option>
                <option value="New">{t('newCustomer')}</option>
                <option value="Bronze">Bronze</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
              </select>

              <select 
                className="input-field" 
                style={{ width: 'auto' }} 
                value={filterOutlet} 
                onChange={e => setOutletFilter(e.target.value)}
                disabled={user?.role !== 'admin'}
              >
                <option value="All">{language === 'ar' ? 'جميع المنافذ' : 'All Outlets'}</option>
                <option value="eltalg">{t('eltalg')}</option>
                <option value="tegara">{t('tegara')}</option>
                <option value="mostashfa">{t('mostashfa')}</option>
              </select>
            </div>
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
              <th>{language === 'ar' ? 'النوع' : 'Gender'}</th>
              <th>{t('tier')}</th>
              <th>{t('deliveries')}</th>
              <th>{t('bostaDeliveries')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
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
                      <select className="input-field" style={{ padding: '0.4rem' }} value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                        <option value="Unknown">{language === 'ar' ? 'غير معروف' : 'Unknown'}</option>
                        <option value="Male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                        <option value="Female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
                      </select>
                    ) : (
                      <span className="badge" style={{ background: customer.gender === 'Male' ? 'rgba(59,130,246,0.1)' : customer.gender === 'Female' ? 'rgba(236,72,153,0.1)' : 'rgba(255,255,255,0.05)', color: customer.gender === 'Male' ? '#3b82f6' : customer.gender === 'Female' ? '#ec4899' : 'var(--text-muted)' }}>
                        {customer.gender === 'Male' ? (language === 'ar' ? 'ذكر' : 'Male') : customer.gender === 'Female' ? (language === 'ar' ? 'أنثى' : 'Female') : (language === 'ar' ? 'غير معروف' : 'Unknown')}
                      </span>
                    )}
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
                        {orders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(customer.phone)).length}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'جوميا' : 'Jumia'}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>
                        {bostaOrders.filter(o => normalizePhone(o.customerPhone) === normalizePhone(customer.phone)).length}
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
                <label className="input-label">{language === 'ar' ? 'النوع' : 'Gender'}</label>
                <select className="input-field" value={newCustomer.gender} onChange={e => setNewCustomer({...newCustomer, gender: e.target.value})}>
                  <option value="Unknown">{language === 'ar' ? 'غير معروف' : 'Unknown'}</option>
                  <option value="Male">{language === 'ar' ? 'ذكر' : 'Male'}</option>
                  <option value="Female">{language === 'ar' ? 'أنثى' : 'Female'}</option>
                </select>
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
