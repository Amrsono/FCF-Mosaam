import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { Edit2, Save, X } from 'lucide-react';
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
  const { customers, updateCustomer } = useDashboard();
  const [editingPhone, setEditingPhone] = useState(null);
  const [editForm, setEditForm] = useState({});

  const startEdit = (customer) => {
    setEditingPhone(customer.phone);
    setEditForm({ ...customer });
  };

  const handleSave = () => {
    updateCustomer(editingPhone, editForm);
    setEditingPhone(null);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ color: 'white', margin: 0 }}>Registered Station Customers</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="badge badge-primary">Total Customers: {customers.length}</div>
          <ExportActions data={customers} headers={exportHeaders} filename="Customers_Export" title="FCF Mosaam Station Customers" />
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
    </div>
  );
}
