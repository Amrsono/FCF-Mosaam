import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { Banknote, AlertCircle } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Name', accessor: 'customerName' },
  { label: 'Customer Phone', accessor: 'customerPhone' },
  { label: 'Received Date', accessor: o => new Date(o.receivedAt).toLocaleDateString() },
  { label: 'Days Parked', accessor: 'daysParked' },
  { label: 'Penalty (EGP)', accessor: 'penalty' }
];

export default function ParkedPenaltiesTab() {
  const { orders, customers, calculatePenalty } = useDashboard();

  const penalizedOrders = orders
    .filter(o => o.status === 'Inventory')
    .map(o => {
       const cust = customers.find(c => c.phone === o.customerPhone);
       return {
         ...o,
         customerName: cust?.name || 'Unknown',
         penalty: calculatePenalty(o),
         daysParked: getDaysDifference(o.receivedAt)
       };
    })
    .filter(o => o.penalty > 0)
    .sort((a, b) => b.penalty - a.penalty);

  const totalPenalties = penalizedOrders.reduce((acc, order) => acc + order.penalty, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(var(--hue-warning), 90%, 15%, 0.8), rgba(var(--hue-danger), 80%, 10%, 0.8))' }}>
        <div>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Banknote size={24} color="var(--color-warning)" /> 
            Total Pending Penalties
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Accrued from orders parked (5 EGP / Day)</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-warning)', textShadow: '0 0 20px rgba(255, 180, 50, 0.4)', lineHeight: 1 }}>
            {totalPenalties} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>EGP</span>
          </div>
          <ExportActions data={penalizedOrders} headers={exportHeaders} filename="Pending_Penalties_Export" title="Jumia Parked Penalties" />
        </div>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer Info</th>
              <th>Received Date</th>
              <th>Days Parked</th>
              <th>Penalty Amount</th>
            </tr>
          </thead>
          <tbody>
            {penaltiesFilteredView(penalizedOrders)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function penaltiesFilteredView(penalizedOrders) {
  if (penalizedOrders.length === 0) {
    return (
      <tr>
        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
           <AlertCircle size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
           No active penalties found across inventory.
        </td>
      </tr>
    );
  }

  return penalizedOrders.map(order => (
    <tr key={order.id}>
      <td style={{ fontWeight: 600 }}>{order.id}</td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{order.customerName}</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
        </div>
      </td>
      <td>{new Date(order.receivedAt).toLocaleDateString()}</td>
      <td>
        <span className="badge badge-warning">{order.daysParked} Days</span>
      </td>
      <td style={{ fontWeight: 600, color: 'var(--color-warning)', fontSize: '1.1rem' }}>
        {order.penalty} EGP
      </td>
    </tr>
  ));
}
