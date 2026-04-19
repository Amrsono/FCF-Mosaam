import React from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { RefreshCcw, PackageX } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Order ID', accessor: 'id' },
  { label: 'Customer Name', accessor: 'customerName' },
  { label: 'Customer Phone', accessor: 'customerPhone' },
  { label: 'Order Value (EGP)', accessor: 'totalValue' },
  { label: 'Received Date', accessor: o => new Date(o.receivedAt).toLocaleDateString() },
  { label: 'Returned Date', accessor: o => o.returnedAt ? new Date(o.returnedAt).toLocaleDateString() : 'N/A' },
  { label: 'Total Days Parked', accessor: 'daysParkedFinal' }
];

export default function ReturnedTab() {
  const { orders, customers } = useDashboard();
  
  // Filter for returned orders
  const returnedOrders = orders
    .filter(o => o.status === 'Returned')
    .map(o => {
      const cust = customers.find(c => c.phone === o.customerPhone);
      return {
        ...o,
        customerName: cust?.name || 'Unknown',
        // How many days it was parked before it was returned.
        // If returnedAt is defined, calculate parked days from receivedAt to returnedAt.
        // Otherwise fallback to days difference from now.
        daysParkedFinal: o.returnedAt 
          ? Math.floor(Math.abs(new Date(o.returnedAt) - new Date(o.receivedAt)) / (1000 * 60 * 60 * 24))
          : getDaysDifference(o.receivedAt)
      };
    })
    .sort((a, b) => new Date(b.returnedAt) - new Date(a.returnedAt));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, rgba(var(--hue-danger), 80%, 15%, 0.8), rgba(var(--hue-primary), 15%, 10%, 0.8))' }}>
        <div>
          <h2 style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCcw size={24} color="var(--color-danger)" /> 
            Returned to Warehouse
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Orders permanently returned after SLA expiration.</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--color-danger)', lineHeight: 1 }}>
            {returnedOrders.length} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Items</span>
          </div>
          <ExportActions data={returnedOrders} headers={exportHeaders} filename="Returned_Orders_Export" title="Jumia Returned Orders" />
        </div>
      </div>

      <div className="table-container" style={{ flex: 1 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Order Value</th>
              <th>Received On</th>
              <th>Returned On</th>
              <th>Total Days Parked</th>
            </tr>
          </thead>
          <tbody>
            {returnedOrders.length > 0 ? returnedOrders.map(order => (
              <tr key={order.id}>
                <td style={{ fontWeight: 600 }}>{order.id}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>{order.customerName}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{order.customerPhone}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.totalValue} EGP</td>
                <td>{new Date(order.receivedAt).toLocaleDateString()}</td>
                <td>
                  <span style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
                    {order.returnedAt ? new Date(order.returnedAt).toLocaleDateString() : '-'}
                  </span>
                </td>
                <td><span className="badge badge-neutral">{order.daysParkedFinal} Days</span></td>
              </tr>
            )) : (
               <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                   <PackageX size={40} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                   No returned orders logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
