import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { AlertTriangle, ShieldCheck, Clock, RefreshCcw } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Phone', accessor: 'customerPhone' },
  { label: 'Received At', accessor: o => new Date(o.receivedAt).toLocaleDateString() },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'SLA Status', accessor: o => o.slaStatus.toUpperCase() }
];

export default function SLATab() {
  const { orders, returnOrder } = useDashboard();

  // Filter only active inventory orders to track their SLA
  const inventoryOrders = orders
    .filter(o => o.status === 'Inventory')
    .map(o => {
      const days = getDaysDifference(o.receivedAt);
      let slaStatus = 'green';
      if (days >= 4) slaStatus = 'red';
      else if (days >= 2) slaStatus = 'orange';

      return { ...o, daysParked: days, slaStatus };
    })
    .sort((a, b) => b.daysParked - a.daysParked);

  const getSlaCardStyle = (status) => {
    switch(status) {
      case 'red': return { borderLeft: '4px solid var(--color-danger)', background: 'linear-gradient(90deg, rgba(var(--hue-danger), 80%, 15%, 0.4), transparent)' };
      case 'orange': return { borderLeft: '4px solid var(--color-warning)', background: 'linear-gradient(90deg, rgba(var(--hue-warning), 90%, 15%, 0.4), transparent)' };
      case 'green': return { borderLeft: '4px solid var(--color-success)', background: 'linear-gradient(90deg, rgba(var(--hue-success), 70%, 15%, 0.4), transparent)' };
      default: return {};
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* SLA Dashboard Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--color-success-bg)', padding: '1rem', borderRadius: '50%' }}>
            <ShieldCheck size={24} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{inventoryOrders.filter(o => o.slaStatus === 'green').length}</div>
            <div style={{ color: 'var(--text-secondary)' }}>On Track (0-1 Days)</div>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--color-warning-bg)', padding: '1rem', borderRadius: '50%' }}>
            <Clock size={24} color="var(--color-warning)" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{inventoryOrders.filter(o => o.slaStatus === 'orange').length}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Delayed (2-3 Days)</div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--color-danger-bg)', padding: '1rem', borderRadius: '50%' }}>
            <AlertTriangle size={24} color="var(--color-danger)" />
          </div>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{inventoryOrders.filter(o => o.slaStatus === 'red').length}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Grace Expired (4+ Days)</div>
          </div>
        </div>
      </div>

      {/* SLA Timeline Review */}
      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ color: 'white' }}>Action Required / Orders Tracking Timeline</h3>
           <ExportActions data={inventoryOrders} headers={exportHeaders} filename="SLA_Tracking_Export" title="Jumia Delivery SLA Tracking" />
        </div>

        {inventoryOrders.map(order => (
          <div key={order.id} style={{ ...getSlaCardStyle(order.slaStatus), padding: '1.25rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'white' }}>{order.id}</span>
                <span className={`badge badge-${order.slaStatus === 'red' ? 'danger' : order.slaStatus === 'orange' ? 'warning' : 'success'}`}>
                  {order.daysParked} Days Parked
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>Received: {new Date(order.receivedAt).toLocaleDateString()}</span>
              {order.slaStatus === 'orange' && <span style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>Customer must be contacted urgently.</span>}
              {order.slaStatus === 'red' && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>Grace period expired! Return to warehouse.</span>}
            </div>

            {order.slaStatus === 'red' && (
              <button className="btn btn-danger" onClick={() => returnOrder(order.id)}>
                <RefreshCcw size={16} /> Return Order
              </button>
            )}
          </div>
        ))}

        {inventoryOrders.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No inventory currently tracked for SLA.</div>
        )}
      </div>

    </div>
  );
}
