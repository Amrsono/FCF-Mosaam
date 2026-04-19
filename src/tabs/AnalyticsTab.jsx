import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { TrendingUp, PackageCheck, AlertOctagon, Users, DollarSign, RefreshCcw, Zap, BarChart2, Briefcase, Activity } from 'lucide-react';
import ExportActions from '../components/ExportActions';

const exportHeaders = [
  { label: 'Category', accessor: 'group' },
  { label: 'Key Performance Indicator (KPI)', accessor: 'metric' },
  { label: 'Value', accessor: 'value' }
];

export default function AnalyticsTab() {
  const { orders, customers, basataTransactions } = useDashboard();
  const [timeframe, setTimeframe] = useState('daily'); // 'daily', 'weekly', 'monthly'

  // Time boundaries
  const now = new Date();
  const msInDay = 86400000;
  let timeLimitMs = timeframe === 'daily' ? msInDay : timeframe === 'weekly' ? msInDay * 7 : msInDay * 30;
  const thresholdDate = new Date(now.getTime() - timeLimitMs);

  // --- JUMIA CALCULATIONS ---
  const pickedUpOrders = orders.filter(o => o.status === 'Picked Up' && new Date(o.pickedUpAt) >= thresholdDate);
  const returnedOrders = orders.filter(o => o.status === 'Returned' && new Date(o.returnedAt) >= thresholdDate);
  const cashCollected = pickedUpOrders.reduce((sum, o) => sum + o.totalValue, 0);
  const newCustomers = customers.filter(c => c.deliveries <= 1).length; 
  const activePenalties = orders.filter(o => o.status === 'Inventory').reduce((sum, o) => {
     const days = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / (1000 * 60 * 60 * 24));
     return sum + (days * 5);
  }, 0);
  const returnedAmount = returnedOrders.reduce((sum, o) => sum + o.totalValue, 0);

  // --- BASATA CALCULATIONS ---
  const activeBasata = basataTransactions.filter(t => new Date(t.performedAt) >= thresholdDate);
  const basataVolume = activeBasata.reduce((sum, t) => sum + t.amount, 0);
  
  // Basata Category Breakdown
  const basataCategories = activeBasata.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  // Find most popular Basata service
  const serviceCounts = activeBasata.reduce((acc, t) => {
    acc[t.serviceProvider] = (acc[t.serviceProvider] || 0) + 1;
    return acc;
  }, {});
  const topService = Object.keys(serviceCounts).length > 0 
    ? Object.keys(serviceCounts).reduce((a, b) => serviceCounts[a] > serviceCounts[b] ? a : b) 
    : 'None';

  // --- GRAND TOTAL ---
  const grandTotal = cashCollected + basataVolume;

  const StatCard = ({ title, value, icon, color, gradient }) => (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: `linear-gradient(135deg, rgba(255,255,255,0.05), ${gradient})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: `rgba(${color}, 0.2)` }}>
           {icon}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{value}</div>
    </div>
  );

  const SectionHeader = ({ title, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', marginTop: '1.5rem' }}>
      {icon}
      <h3 style={{ color: 'white', margin: 0 }}>{title}</h3>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', paddingRight: '0.5rem', overflowY: 'auto' }}>
      
      {/* Filters & Export Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)', paddingBottom: '1rem' }}>
         <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', margin: 0 }}>
           <TrendingUp size={24} color="var(--color-primary)" />
           Performance Analytics
         </h2>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              <button className={`btn ${timeframe === 'daily' ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none' }} onClick={() => setTimeframe('daily')}>Daily</button>
              <button className={`btn ${timeframe === 'weekly' ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none' }} onClick={() => setTimeframe('weekly')}>Weekly</button>
              <button className={`btn ${timeframe === 'monthly' ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none' }} onClick={() => setTimeframe('monthly')}>Monthly</button>
            </div>
            <div style={{ paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
              <ExportActions 
                data={[
                  { group: 'Overview', metric: 'Grand Total Revenue', value: `${grandTotal} EGP` },
                  { group: 'Jumia', metric: 'Orders Picked Up', value: pickedUpOrders.length },
                  { group: 'Jumia', metric: 'Cash Collected', value: `${cashCollected} EGP` },
                  { group: 'Jumia', metric: 'New Customers', value: newCustomers },
                  { group: 'Jumia', metric: 'Active Penalties Pool', value: `${activePenalties} EGP` },
                  { group: 'Basata', metric: 'POS Volume', value: `${basataVolume} EGP` },
                  { group: 'Basata', metric: 'Transaction Count', value: activeBasata.length },
                  { group: 'Basata', metric: 'Top Service', value: topService }
                ]} 
                headers={exportHeaders} 
                filename={`Analytics_Detailed_${timeframe}`} 
                title={`Jumia & Basata Analytics (${timeframe.toUpperCase()})`} 
              />
            </div>
         </div>
      </div>

      {/* GRAND OVERVIEW */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(var(--hue-primary), 80%, 65%, 0.15), rgba(var(--hue-accent), 80%, 60%, 0.05))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
           <div style={{ color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity size={18} color="var(--color-primary)" /> Total Station Revenue (All Streams)
           </div>
           <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
             {grandTotal.toLocaleString()} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>EGP</span>
           </div>
         </div>
         <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>+ {pickedUpOrders.length + activeBasata.length} Total Processed Tasks</div>
         </div>
      </div>

      {/* JUMIA OPERATIONS */}
      <SectionHeader title="Jumia E-Commerce Operations" icon={<Briefcase size={22} color="var(--color-success)" />} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
         <StatCard 
            title="Jumia Cash Collected" 
            value={`${cashCollected.toLocaleString()} EGP`} 
            icon={<DollarSign size={20} color="var(--color-success)" />} 
            color="var(--hue-success), 80%, 60%"
            gradient="rgba(var(--hue-success), 80%, 60%, 0.1)"
         />
         <StatCard 
            title="Orders Picked Up" 
            value={pickedUpOrders.length} 
            icon={<PackageCheck size={20} color="var(--color-success)" />} 
            color="var(--hue-success), 70%, 50%"
            gradient="transparent"
         />
         <StatCard 
            title="Orders Returned" 
            value={returnedOrders.length} 
            icon={<AlertOctagon size={20} color="var(--color-danger)" />} 
            color="var(--hue-danger), 80%, 60%"
            gradient="rgba(var(--hue-danger), 80%, 60%, 0.1)"
         />
         <StatCard 
            title="Penalties Pool" 
            value={`${activePenalties} EGP`} 
            icon={<DollarSign size={20} color="var(--color-warning)" />} 
            color="var(--hue-warning), 90%, 55%"
            gradient="transparent"
         />
      </div>

      {/* BASATA OPERATIONS */}
      <SectionHeader title="Basata POS Performance" icon={<Zap size={22} color="var(--color-accent)" />} />
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        
        {/* Basata Core Stats */}
        <div style={{ flex: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <StatCard 
              title="Basata POS Volume" 
              value={`${basataVolume.toLocaleString()} EGP`} 
              icon={<Zap size={20} color="var(--color-accent)" />} 
              color="var(--hue-accent), 80%, 60%"
              gradient="rgba(var(--hue-accent), 80%, 60%, 0.15)"
          />
          <StatCard 
              title="Transactions Count" 
              value={activeBasata.length} 
              icon={<BarChart2 size={20} color="var(--color-accent)" />} 
              color="var(--hue-accent), 80%, 60%"
              gradient="transparent"
          />
          <StatCard 
              title="Most Popular Service" 
              value={topService} 
              icon={<Users size={20} color="var(--color-accent)" />} 
              color="var(--hue-accent), 80%, 60%"
              gradient="transparent"
          />
        </div>

        {/* Categories Breakdown */}
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', background: 'var(--bg-panel)' }}>
          <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Revenue by Basata Category</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.keys(basataCategories).length > 0 ? Object.keys(basataCategories).map(cat => (
              <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'white', fontWeight: 500 }}>{cat}</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{basataCategories[cat].toLocaleString()} EGP</span>
              </div>
            )) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No categorized data available.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
