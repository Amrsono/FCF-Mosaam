import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Plus, UserCheck, RefreshCw, Package } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Name', accessor: 'customerName' },
  { label: 'Phone', accessor: 'customerPhone' },
  { label: 'Description', accessor: 'description' },
  { label: 'Category', accessor: 'category' },
  { label: 'Value (EGP)', accessor: 'totalValue' },
  { label: 'Status', accessor: 'status' },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'SLA Status', accessor: o => o.daysParked >= 4 ? 'EXPIRED' : o.daysParked >= 2 ? 'WARNING' : 'ON TRACK' }
];

export default function BostaTab() {
  const { bostaOrders, customers, receiveBostaOrder, markBostaOrderPickedUp, returnBostaOrder } = useDashboard();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Inventory');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showModal, setShowModal] = useState(false);

  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', customerName: '', description: '', totalValue: '', category: 'Electronics'
  });

  const orderList = useMemo(() => {
    return bostaOrders.map(order => {
      const cust = customers.find(c => c.phone === order.customerPhone);
      const daysParked = order.status === 'Inventory' ? getDaysDifference(order.receivedAt) : 0;
      return {
        ...order,
        customerName: cust?.name || 'Unknown',
        tier: cust?.tier || 'New',
        daysParked
      };
    }).filter(o => {
      const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            o.customerPhone.includes(searchTerm);
      const matchesStatus = filterStatus === 'All' || o.status === filterStatus;
      const matchesCategory = filterCategory === 'All' || o.category === filterCategory;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [bostaOrders, customers, searchTerm, filterStatus, filterCategory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone) return;
    receiveBostaOrder({
      id: newOrder.id,
      customerPhone: newOrder.customerPhone,
      customerName: newOrder.customerName,
      description: newOrder.description,
      totalValue: Number(newOrder.totalValue),
      category: newOrder.category
    });
    setShowModal(false);
    setNewOrder({ id: '', customerPhone: '', customerName: '', description: '', totalValue: '', category: 'Electronics' });
  };

  const getSlaColor = (days) => {
    if (days >= 4) return 'var(--color-danger)';
    if (days >= 2) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const getSlaLabel = (days) => {
    if (days >= 4) return 'EXPIRED';
    if (days >= 2) return 'WARNING';
    return 'ON TRACK';
  };

  const inventoryCount = bostaOrders.filter(o => o.status === 'Inventory').length;
  const pickedUpCount = bostaOrders.filter(o => o.status === 'Picked Up').length;
  const returnedCount = bostaOrders.filter(o => o.status === 'Returned').length;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* Header Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), transparent)', borderLeft: '3px solid #6366f1', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>In Inventory</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{inventoryCount}</div>
        </div>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), transparent)', borderLeft: '3px solid var(--color-success)', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Picked Up</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{pickedUpCount}</div>
        </div>
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), transparent)', borderLeft: '3px solid var(--color-danger)', padding: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Returned to Bosta</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-danger)' }}>{returnedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '250px', flex: '1 1 200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search Order ID or Phone..."
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="input-field" style={{ flex: '1 1 140px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Inventory">In Inventory</option>
            <option value="Picked Up">Picked Up</option>
            <option value="Returned">Returned</option>
          </select>
          <select className="input-field" style={{ flex: '1 1 120px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Apparel">Apparel</option>
            <option value="Home">Home</option>
            <option value="Groceries">Groceries</option>
          </select>
        </div>
        <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flex: '1 1 auto' }} onClick={() => setShowModal(true)}>
          <Plus size={18} /> Receive Bosta Package
        </button>
      </div>

      {/* Export bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="badge badge-neutral">Showing: {orderList.length} Bosta Orders</div>
        <ExportActions data={orderList} headers={exportHeaders} filename="Bosta_Orders_Export" title="Bosta Orders Dashboard" />
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Bosta Order ID</th>
              <th>Customer</th>
              <th>Details</th>
              <th>Status</th>
              <th>SLA / Days Parked</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length > 0 ? orderList.map(order => (
              <tr key={order.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={14} color="#6366f1" />
                    <span style={{ fontWeight: 600 }}>{order.id}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                    <span className="badge badge-neutral" style={{ marginTop: '0.3rem', alignSelf: 'flex-start', fontSize: '0.65rem' }}>Tier: {order.tier}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.description}</span>
                    <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 600 }}>{order.totalValue} EGP</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{order.category}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${order.status === 'Inventory' ? 'badge-warning' : order.status === 'Picked Up' ? 'badge-success' : 'badge-danger'}`}>
                    {order.status}
                  </span>
                </td>
                <td>
                  {order.status === 'Inventory' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ color: getSlaColor(order.daysParked), fontWeight: 600 }}>{order.daysParked} Days Parked</span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: `${getSlaColor(order.daysParked)}22`,
                        color: getSlaColor(order.daysParked),
                        padding: '0.1rem 0.5rem',
                        borderRadius: '999px',
                        alignSelf: 'flex-start'
                      }}>
                        {getSlaLabel(order.daysParked)}
                      </span>
                      {order.daysParked >= 4 && (
                        <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }}>⚠ Return to Bosta recommended</span>
                      )}
                    </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td>
                  {order.status === 'Inventory' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem', color: 'var(--color-success)' }}
                        title="Mark Picked Up"
                        onClick={() => markBostaOrderPickedUp(order.id)}
                      >
                        <UserCheck size={16} />
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                        title="Return to Bosta"
                        onClick={() => returnBostaOrder(order.id)}
                      >
                        <RefreshCw size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No Bosta orders found. Receive a package to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Receive Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', background: 'var(--bg-main)', borderTop: '3px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ color: 'white', margin: 0 }}>Receive Bosta Package</h3>
              <Package color="#6366f1" size={24} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label className="input-label">Bosta Order ID</label>
                <input required className="input-field" value={newOrder.id} onChange={e => setNewOrder({ ...newOrder, id: e.target.value })} placeholder="e.g. BST-001" />
              </div>
              <div className="input-group">
                <label className="input-label">Customer Phone</label>
                <input required className="input-field" value={newOrder.customerPhone} onChange={e => setNewOrder({ ...newOrder, customerPhone: e.target.value })} placeholder="01..." />
              </div>
              <div className="input-group">
                <label className="input-label">Customer Name</label>
                <input className="input-field" value={newOrder.customerName} onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })} placeholder="Name" />
              </div>
              <div className="input-group">
                <label className="input-label">Description</label>
                <input required className="input-field" value={newOrder.description} onChange={e => setNewOrder({ ...newOrder, description: e.target.value })} placeholder="Items..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">Total Value (EGP)</label>
                  <input required type="number" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({ ...newOrder, totalValue: e.target.value })} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: '1 1 150px' }}>
                  <label className="input-label">Category</label>
                  <select className="input-field" value={newOrder.category} onChange={e => setNewOrder({ ...newOrder, category: e.target.value })}>
                    <option>Electronics</option>
                    <option>Apparel</option>
                    <option>Home</option>
                    <option>Groceries</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Confirm Receipt</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
