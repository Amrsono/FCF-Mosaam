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
  { label: 'Total Deliveries', accessor: 'deliveries' }
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
        <h3 style={{ color: 'white' }}>Registered Station Customers</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="badge badge-primary">Total Customers: {customers.length}</div>
          <ExportActions data={customers} headers={exportHeaders} filename="Customers_Export" title="Jumia Station Customers" />
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
              <th>Deliveries</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => {
              const isEditing = editingPhone === customer.phone;
              
              return (
                <tr key={customer.phone}>
                  <td style={{ fontWeight: 600 }}>{customer.phone}</td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '120px' }} value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                    ) : customer.name}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '150px' }} value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} placeholder="Missing Email" />
                    ) : customer.email || <span style={{ color: 'var(--color-danger)' }}>Missing Data</span>}
                  </td>
                  <td>
                    {isEditing ? (
                      <input className="input-field" style={{ padding: '0.4rem', width: '180px' }} value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} placeholder="Missing Address" />
                    ) : customer.address || <span style={{ color: 'var(--color-danger)' }}>Missing Data</span>}
                  </td>
                  <td>
                     {isEditing ? (
                      <select className="input-field" style={{ padding: '0.4rem' }} value={editForm.tier} onChange={e => setEditForm({...editForm, tier: e.target.value})}>
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
                    <span style={{ fontWeight: 600 }}>{customer.deliveries}</span>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} onClick={handleSave}><Save size={16} /></button>
                        <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} onClick={() => setEditingPhone(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <button className="btn btn-outline" style={{ padding: '0.4rem' }} onClick={() => startEdit(customer)}>
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
