import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Edit2, Save, X, Plus, UserPlus } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Phone / ID', accessor: 'phone' },
  { label: 'Name', accessor: 'name' },
  { label: 'Email', accessor: 'email' },
  { label: 'Address', accessor: 'address' },
  { label: 'Tier', accessor: 'tier' },
  { label: 'Jumia Deliveries', accessor: 'deliveries' },
  { label: 'Bosta Deliveries', accessor: 'bostaDeliveries' },
  { label: 'Total Deliveries', accessor: c => (c.deliveries || 0) + (c.bostaDeliveries || 0) }
];

export default function CustomersTab() {
  const { customers, updateCustomer, addCustomer } = useDashboard();
  const [editingPhone, setEditingPhone] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    phone: '', name: '', email: '', address: '', tier: 'New'
  });
  const [error, setError] = useState('');

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
      setError(res.error || 'Failed to add customer');
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ color: 'white', margin: 0, flex: '1 1 100%' }}>Registered Station Customers</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
          <div className="badge badge-primary">Total: {customers.length}</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setShowAddModal(true); setError(''); }} style={{ flex: '1 1 auto' }}>
              <UserPlus size={18} /> Register Customer
            </button>
            <ExportActions data={customers} headers={exportHeaders} filename="Customers_Export" title="FCF Mosaam Station Customers" />
          </div>
        </div>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Phone / ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Address</th>
              <th>Tier</th>
              <th>Jumia Deliveries</th>
              <th>Bosta Deliveries</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length > 0 ? customers.map(customer => {
              const isEditing = editingPhone === customer.phone;
              return (
                <tr key={customer.phone}>
                  <td style={{ fontWeight: 600 }}>{customer.phone}</td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '120px' }} value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    ) : customer.name}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '150px' }} value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
                    ) : customer.email || <span style={{ color: 'var(--color-danger)' }}>Missing</span>}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '180px' }} value={editForm.address || ''} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" />
                    ) : customer.address || <span style={{ color: 'var(--color-danger)' }}>Missing</span>}
                  </td>
                  <td>
                    {isEditing ? (
                      <select className="input-field" style={{ padding: '0.4rem' }} value={editForm.tier} onChange={e => setEditForm({ ...editForm, tier: e.target.value })}>
                        <option>New</option>
                        <option>Bronze</option>
                        <option>Silver</option>
                        <option>Gold</option>
                      </select>
                    ) : (
                      <span className="badge badge-neutral">{customer.tier}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{customer.deliveries || 0}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Jumia</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1' }}>{customer.bostaDeliveries || 0}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Bosta</span>
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
                <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No customers registered yet.</td>
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
              <UserPlus color="var(--color-primary)" /> Register Customer
            </h2>
            
            {error && (
              <div className="badge badge-danger" style={{ marginBottom: '1rem', width: '100%', padding: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 200px' }}>
                  <label className="input-label">Phone Number</label>
                  <input required className="input-field" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="01..." />
                </div>
                <div className="input-group" style={{ flex: '1 1 200px' }}>
                  <label className="input-label">Full Name</label>
                  <input required className="input-field" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Name" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Email Address (Optional)</label>
                <input type="email" className="input-field" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="customer@example.com" />
              </div>

              <div className="input-group">
                <label className="input-label">Home Address</label>
                <input className="input-field" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Area, Street, Building..." />
              </div>

              <div className="input-group">
                <label className="input-label">Assigned Tier</label>
                <select className="input-field" value={newCustomer.tier} onChange={e => setNewCustomer({...newCustomer, tier: e.target.value})}>
                  <option>New</option>
                  <option>Bronze</option>
                  <option>Silver</option>
                  <option>Gold</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Complete Registration</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
