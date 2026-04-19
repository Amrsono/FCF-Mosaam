import React, { useState } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { AlertTriangle, ShieldCheck, Clock, RefreshCcw, Package } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const jumiaExportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Phone', accessor: 'customerPhone' },
  { label: 'Received At', accessor: o => new Date(o.receivedAt).toLocaleDateString() },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'SLA Status', accessor: o => o.slaStatus.toUpperCase() }
];

const bostaExportHeaders = [
  { label: 'Bosta Order ID', accessor: 'id' },
  { label: 'Customer Phone', accessor: 'customerPhone' },
  { label: 'Received At', accessor: o => new Date(o.receivedAt).toLocaleDateString() },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'SLA Status', accessor: o => o.slaStatus.toUpperCase() }
];

export default function SLATab() {
  const { orders, returnOrder, bostaOrders, returnBostaOrder } = useDashboard();
  const [activeSource, setActiveSource] = useState('jumia'); // 'jumia' | 'bosta'

  const buildSlaList = (orderSet) =>
    orderSet
      .filter(o => o.status === 'Inventory')
      .map(o => {
        const days = getDaysDifference(o.receivedAt);
        let slaStatus = 'green';
        if (days >= 4) slaStatus = 'red';
        else if (days >= 2) slaStatus = 'orange';
        return { ...o, daysParked: days, slaStatus };
      })
      .sort((a, b) => b.daysParked - a.daysParked);

  const jumiaInventory = buildSlaList(orders);
  const bostaInventory = buildSlaList(bostaOrders);
  const inventoryOrders = activeSource === 'jumia' ? jumiaInventory : bostaInventory;
  const handleReturn = activeSource === 'jumia' ? returnOrder : returnBostaOrder;

  const getSlaCardStyle = (status) => {
    switch (status) {
      case 'red': return { borderLeft: '4px solid var(--color-danger)', background: 'linear-gradient(90deg, rgba(239,68,68,0.12), transparent)' };
      case 'orange': return { borderLeft: '4px solid var(--color-warning)', background: 'linear-gradient(90deg, rgba(245,158,11,0.12), transparent)' };
      case 'green': return { borderLeft: '4px solid var(--color-success)', background: 'linear-gradient(90deg, rgba(34,197,94,0.12), transparent)' };
      default: return {};
    }
  };

  const SlaStats = ({ list }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(34,197,94,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <ShieldCheck size={24} color="var(--color-success)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'green').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>On Track (0-1 Days)</div>
        </div>
      </div>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(245,158,11,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <Clock size={24} color="var(--color-warning)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'orange').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Delayed (2-3 Days)</div>
        </div>
      </div>
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'rgba(239,68,68,0.15)', padding: '1rem', borderRadius: '50%' }}>
          <AlertTriangle size={24} color="var(--color-danger)" />
        </div>
        <div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{list.filter(o => o.slaStatus === 'red').length}</div>
          <div style={{ color: 'var(--text-secondary)' }}>Grace Expired (4+ Days)</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* Source Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', alignSelf: 'flex-start', border: '1px solid var(--border-color)' }}>
        <button
          className={`btn ${activeSource === 'jumia' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', gap: '0.5rem' }}
          onClick={() => setActiveSource('jumia')}
        >
          <Package size={16} /> Jumia SLA
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}>{jumiaInventory.length}</span>
        </button>
        <button
          className={`btn ${activeSource === 'bosta' ? 'btn-primary' : 'btn-outline'}`}
          style={{ border: 'none', gap: '0.5rem', ...(activeSource === 'bosta' ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}) }}
          onClick={() => setActiveSource('bosta')}
        >
          <Package size={16} /> Bosta SLA
          <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.8rem' }}>{bostaInventory.length}</span>
        </button>
      </div>

      <SlaStats list={inventoryOrders} />

      {/* Timeline */}
      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: 'white', margin: 0 }}>
            {activeSource === 'jumia' ? 'Jumia' : 'Bosta'} SLA Tracking Timeline
          </h3>
          <ExportActions
            data={inventoryOrders}
            headers={activeSource === 'jumia' ? jumiaExportHeaders : bostaExportHeaders}
            filename={`${activeSource === 'jumia' ? 'Jumia' : 'Bosta'}_SLA_Export`}
            title={`${activeSource === 'jumia' ? 'Jumia' : 'Bosta'} Delivery SLA Tracking`}
          />
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
              {order.slaStatus === 'orange' && <span style={{ color: 'var(--color-warning)', fontSize: '0.85rem' }}>⚠ Contact customer urgently.</span>}
              {order.slaStatus === 'red' && <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>🚨 Grace period expired! Return recommended.</span>}
            </div>
            {order.slaStatus === 'red' && (
              <button className="btn btn-danger" onClick={() => handleReturn(order.id)}>
                <RefreshCcw size={16} /> Return Order
              </button>
            )}
          </div>
        ))}

        {inventoryOrders.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No {activeSource === 'jumia' ? 'Jumia' : 'Bosta'} inventory currently tracked for SLA.
          </div>
        )}
      </div>
    </div>
  );
}
