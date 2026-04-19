import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Search, Filter, Plus, UserCheck, RefreshCw } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Name', accessor: 'customerName' },
  { label: 'Phone', accessor: 'customerPhone' },
  { label: 'Items', accessor: 'description' },
  { label: 'Category', accessor: 'category' },
  { label: 'Value (EGP)', accessor: 'totalValue' },
  { label: 'Status', accessor: 'status' },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'Penalty (EGP)', accessor: 'penalty' },
];

export default function OrdersTab() {
  const { orders, customers, receiveOrder, calculatePenalty, markOrderPickedUp, returnOrder } = useDashboard();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTier, setFilterTier] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Inventory');

  const [showSimulateModal, setShowSimulateModal] = useState(false);

  // Form for new order simulation
  const [newOrder, setNewOrder] = useState({
    id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: ''
  });

  // Derived Data
  const orderList = useMemo(() => {
    return orders.map(order => {
      const cust = customers.find(c => c.phone === order.customerPhone);
      return {
        ...order,
        customerName: cust?.name || 'Unknown',
        tier: cust?.tier || 'New',
        penalty: calculatePenalty(order),
        daysParked: order.status === 'Inventory' ? getDaysDifference(order.receivedAt) : 0
      };
    }).filter(order => {
      // Search
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            order.customerPhone.includes(searchTerm);
      // Category Filter
      const matchesCategory = filterCategory === 'All' || order.category === filterCategory;
      // Tier Filter
      const matchesTier = filterTier === 'All' || order.tier === filterTier;
      // Status Filter
      const matchesStatus = filterStatus === 'All' || order.status === filterStatus;

      return matchesSearch && matchesCategory && matchesTier && matchesStatus;
    }).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
  }, [orders, customers, searchTerm, filterCategory, filterTier, filterStatus, calculatePenalty]);

  const handleSimulateReceive = (e) => {
    e.preventDefault();
    if (!newOrder.id || !newOrder.customerPhone) return;
    
    receiveOrder({
      id: newOrder.id,
      customerPhone: newOrder.customerPhone,
      customerName: newOrder.customerName,
      description: newOrder.description,
      totalValue: Number(newOrder.totalValue),
      category: newOrder.category
    });
    setShowSimulateModal(false);
    setNewOrder({ id: '', customerPhone: '', description: '', totalValue: '', category: 'Electronics', customerName: '' });
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
          <div style={{ position: 'relative', width: '250px' }}>
             <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
             <input 
               type="text" 
               className="input-field" 
               placeholder="Search Order or Phone..." 
               style={{ paddingLeft: '2.5rem', width: '100%' }}
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
          </div>
          
          <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Inventory">In Inventory</option>
            <option value="Picked Up">Picked Up</option>
            <option value="Returned">Returned</option>
          </select>

          <select className="input-field" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
             <option value="All">All Categories</option>
             <option value="Electronics">Electronics</option>
             <option value="Apparel">Apparel</option>
             <option value="Home">Home</option>
             <option value="Groceries">Groceries</option>
          </select>

          <select className="input-field" value={filterTier} onChange={e => setFilterTier(e.target.value)}>
             <option value="All">All Tiers</option>
             <option value="New">New</option>
             <option value="Bronze">Bronze</option>
             <option value="Silver">Silver</option>
             <option value="Gold">Gold</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={() => setShowSimulateModal(true)}>
          <Plus size={18} /> Receive / Add Order
        </button>
      </div>

      {/* Summary Chips & Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', gap: '1rem' }}>
           <div className="badge badge-neutral">Showing: {orderList.length} Orders</div>
           <div className="badge badge-warning">Penalties Accumulated: {orderList.reduce((acc, o) => acc + (o.penalty || 0), 0)} EGP</div>
         </div>
         <ExportActions data={orderList} headers={exportHeaders} filename="Orders_Export" title="Orders Inventory Dashboard" />
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Details</th>
              <th>Status</th>
              <th>Parked Info</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderList.length > 0 ? orderList.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.id}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                    <span className={`badge badge-neutral`} style={{ marginTop: '0.3rem', alignSelf: 'flex-start', fontSize: '0.65rem' }}>Tier: {order.tier}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.description}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>{order.totalValue} EGP</span>
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
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                       <span style={{ color: order.daysParked >= 4 ? 'var(--color-danger)' : 'inherit' }}>{order.daysParked} Days Parked</span>
                       <span style={{ fontWeight: 600, color: order.penalty > 0 ? 'var(--color-danger)' : 'var(--text-secondary)' }}>{order.penalty} EGP Penalty</span>
                     </div>
                  ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                </td>
                <td>
                   {order.status === 'Inventory' && (
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-success)' }} title="Mark Picked Up" onClick={() => markOrderPickedUp(order.id)}>
                         <UserCheck size={16} />
                       </button>
                       <button className="btn btn-outline" style={{ padding: '0.4rem', color: 'var(--color-danger)' }} title="Return to Warehouse" onClick={() => returnOrder(order.id)}>
                         <RefreshCw size={16} />
                       </button>
                     </div>
                   )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No orders found matching the criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Simple Modal Simulation */}
      {showSimulateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', background: 'var(--bg-main)' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'white' }}>Receive New Order</h3>
            <form onSubmit={handleSimulateReceive}>
              <div className="input-group">
                <label className="input-label">Order ID</label>
                <input required className="input-field" value={newOrder.id} onChange={e => setNewOrder({...newOrder, id: e.target.value})} placeholder="e.g. ORD-9999" />
              </div>
              <div className="input-group">
                <label className="input-label">Customer Phone</label>
                <input required className="input-field" value={newOrder.customerPhone} onChange={e => setNewOrder({...newOrder, customerPhone: e.target.value})} placeholder="01..." />
              </div>
              <div className="input-group">
                 <label className="input-label">Customer Name</label>
                 <input className="input-field" value={newOrder.customerName} onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} placeholder="Name" />
              </div>
              <div className="input-group">
                <label className="input-label">Order Description</label>
                <input required className="input-field" value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} placeholder="Items..." />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Total Value (EGP)</label>
                  <input required type="number" className="input-field" value={newOrder.totalValue} onChange={e => setNewOrder({...newOrder, totalValue: e.target.value})} placeholder="0.00" />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Category</label>
                  <select className="input-field" value={newOrder.category} onChange={e => setNewOrder({...newOrder, category: e.target.value})}>
                     <option>Electronics</option>
                     <option>Apparel</option>
                     <option>Home</option>
                     <option>Groceries</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Receive Order</button>
                <button type="button" className="btn btn-outline" onClick={() => setShowSimulateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
