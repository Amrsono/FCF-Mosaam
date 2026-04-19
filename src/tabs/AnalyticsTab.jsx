import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import {
  TrendingUp, PackageCheck, AlertOctagon, Users, DollarSign,
  RefreshCcw, Zap, BarChart2, Briefcase, Activity, Package,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Clock
} from 'lucide-react';
import ExportActions from '../components/ExportActions';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';

const exportHeaders = [
  { label: 'Stream', accessor: 'group' },
  { label: 'KPI', accessor: 'metric' },
  { label: 'Value', accessor: 'value' }
];

const CHART_COLORS = {
  jumia: '#f97316',
  bosta: '#6366f1',
  basata: '#22d3ee',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,15,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
        {label && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginBottom: '0.4rem' }}>{label}</div>}
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.9rem' }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value} {p.unit || ''}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsTab() {
  const { orders, customers, basataTransactions, bostaOrders } = useDashboard();
  const [timeframe, setTimeframe] = useState('daily');

  // Time boundary
  const now = new Date();
  const msInDay = 86400000;
  const timeLimitMs = timeframe === 'daily' ? msInDay : timeframe === 'weekly' ? msInDay * 7 : msInDay * 30;
  const thresholdDate = new Date(now.getTime() - timeLimitMs);

  // --- JUMIA ---
  const jumiaPickedUp = orders.filter(o => o.status === 'Picked Up' && new Date(o.pickedUpAt) >= thresholdDate);
  const jumiaReturned = orders.filter(o => o.status === 'Returned' && new Date(o.returnedAt) >= thresholdDate);
  const jumiaInventory = orders.filter(o => o.status === 'Inventory');
  const jumiaCash = jumiaPickedUp.reduce((s, o) => s + o.totalValue, 0);
  const jumiaReturnedAmt = jumiaReturned.reduce((s, o) => s + o.totalValue, 0);
  const activePenalties = jumiaInventory.reduce((s, o) => {
    const days = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return s + days * 5;
  }, 0);
  const jumiaSlaCritical = jumiaInventory.filter(o => {
    const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return d >= 4;
  }).length;
  const jumiaSlaNear = jumiaInventory.filter(o => {
    const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return d >= 2 && d < 4;
  }).length;

  // --- BOSTA ---
  const bostaPickedUp = bostaOrders.filter(o => o.status === 'Picked Up' && new Date(o.pickedUpAt) >= thresholdDate);
  const bostaReturned = bostaOrders.filter(o => o.status === 'Returned' && new Date(o.returnedAt) >= thresholdDate);
  const bostaInventory = bostaOrders.filter(o => o.status === 'Inventory');
  const bostaCash = bostaPickedUp.reduce((s, o) => s + o.totalValue, 0);
  const bostaReturnedAmt = bostaReturned.reduce((s, o) => s + o.totalValue, 0);

  // --- BASATA ---
  const activeBasata = basataTransactions.filter(t => new Date(t.performedAt) >= thresholdDate);
  const basataVolume = activeBasata.reduce((s, t) => s + t.amount, 0);
  const basataCategories = activeBasata.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const basataProviders = activeBasata.reduce((acc, t) => {
    acc[t.serviceProvider] = (acc[t.serviceProvider] || 0) + 1;
    return acc;
  }, {});
  const topService = Object.keys(basataProviders).length > 0
    ? Object.keys(basataProviders).reduce((a, b) => basataProviders[a] > basataProviders[b] ? a : b)
    : 'None';

  // --- GRAND TOTAL ---
  const grandTotal = jumiaCash + bostaCash + basataVolume;

  // --- CHART DATA ---
  const revenueStreamData = [
    { name: 'Jumia', value: jumiaCash, color: CHART_COLORS.jumia },
    { name: 'Bosta', value: bostaCash, color: CHART_COLORS.bosta },
    { name: 'Basata', value: basataVolume, color: CHART_COLORS.basata },
  ];

  const ordersStatusData = [
    { name: 'Jumia Picked Up', value: jumiaPickedUp.length, color: CHART_COLORS.success },
    { name: 'Jumia In Inventory', value: jumiaInventory.length, color: CHART_COLORS.warning },
    { name: 'Jumia Returned', value: jumiaReturned.length, color: CHART_COLORS.danger },
    { name: 'Bosta Picked Up', value: bostaPickedUp.length, color: CHART_COLORS.bosta },
    { name: 'Bosta In Inventory', value: bostaInventory.length, color: '#a5b4fc' },
    { name: 'Bosta Returned', value: bostaReturned.length, color: '#f87171' },
  ].filter(d => d.value > 0);

  const basataCatData = Object.keys(basataCategories).map(cat => ({
    name: cat,
    amount: basataCategories[cat],
  }));

  const basataProviderData = Object.keys(basataProviders)
    .sort((a, b) => basataProviders[b] - basataProviders[a])
    .slice(0, 6)
    .map(p => ({ name: p, count: basataProviders[p] }));

  const slaHealthData = [
    { name: 'Jumia Critical', value: jumiaSlaCritical, fill: CHART_COLORS.danger },
    { name: 'Jumia Near', value: jumiaSlaNear, fill: CHART_COLORS.warning },
    { name: 'Jumia OK', value: Math.max(0, jumiaInventory.length - jumiaSlaCritical - jumiaSlaNear), fill: CHART_COLORS.success },
  ];

  const comparisonData = [
    { name: 'Orders In', jumia: jumiaInventory.length, bosta: bostaInventory.length },
    { name: 'Picked Up', jumia: jumiaPickedUp.length, bosta: bostaPickedUp.length },
    { name: 'Returned', jumia: jumiaReturned.length, bosta: bostaReturned.length },
  ];

  // Metric Card
  const MetricCard = ({ title, value, sub, icon, color, trend, trendDir }) => (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: `3px solid ${color || 'var(--border-color)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{icon}{title}</div>
        {trendDir && (
          <span style={{ color: trendDir === 'up' ? CHART_COLORS.success : CHART_COLORS.danger, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            {trendDir === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );

  const ChartCard = ({ title, icon, children, style }) => (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {icon}
        <h4 style={{ color: 'white', margin: 0, fontSize: '0.95rem' }}>{title}</h4>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', paddingRight: '0.5rem' }}>

      {/* Sticky Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', margin: 0, fontSize: '1.25rem' }}>
          <TrendingUp size={22} color="var(--color-primary)" /> Performance
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap' }}>
            {['daily', 'weekly', 'monthly'].map(tf => (
              <button key={tf} className={`btn ${timeframe === tf ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setTimeframe(tf)}>
                {tf.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ paddingLeft: '0.5rem', borderLeft: '1px solid var(--border-color)' }}>
            <ExportActions
              data={[
                { group: 'Overview', metric: 'Grand Total Revenue', value: `${grandTotal} EGP` },
                { group: 'Jumia', metric: 'Cash Collected', value: `${jumiaCash} EGP` },
                { group: 'Jumia', metric: 'Picked Up', value: jumiaPickedUp.length },
                { group: 'Jumia', metric: 'Returned', value: jumiaReturned.length },
                { group: 'Jumia', metric: 'Penalties Pool', value: `${activePenalties} EGP` },
                { group: 'Bosta', metric: 'Cash Collected', value: `${bostaCash} EGP` },
                { group: 'Bosta', metric: 'Picked Up', value: bostaPickedUp.length },
                { group: 'Bosta', metric: 'Returned', value: bostaReturned.length },
                { group: 'Basata', metric: 'POS Volume', value: `${basataVolume} EGP` },
                { group: 'Basata', metric: 'Transactions', value: activeBasata.length },
              ]}
              headers={exportHeaders}
              filename={`Analytics_${timeframe}`}
              title={`FCF Mosaam Analytics (${timeframe.toUpperCase()})`}
            />
          </div>
        </div>
      </div>

      {/* Grand Revenue Hero */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(249,115,22,0.1))', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Activity size={14} /> Total Station Revenue
            </div>
            <div style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {grandTotal.toLocaleString()}
              <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>EGP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {[
              { label: 'Jumia', value: jumiaCash, color: CHART_COLORS.jumia },
              { label: 'Bosta', value: bostaCash, color: CHART_COLORS.bosta },
              { label: 'Basata', value: basataVolume, color: CHART_COLORS.basata },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 auto', minWidth: '80px', textAlign: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, margin: '0 auto 0.4rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <MetricCard title="Jumia Cash" value={`${jumiaCash.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.jumia} sub={`${jumiaPickedUp.length} orders picked up`} />
        <MetricCard title="Bosta Cash" value={`${bostaCash.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.bosta} sub={`${bostaPickedUp.length} orders picked up`} />
        <MetricCard title="Basata POS" value={`${basataVolume.toLocaleString()} EGP`} icon={<Zap size={14} />} color={CHART_COLORS.basata} sub={`${activeBasata.length} transactions`} />
        <MetricCard title="Penalties Pool" value={`${activePenalties} EGP`} icon={<AlertOctagon size={14} />} color={CHART_COLORS.warning} sub={`${jumiaInventory.length} parked orders`} />
        <MetricCard title="SLA Critical" value={jumiaSlaCritical} icon={<ShieldAlert size={14} />} color={CHART_COLORS.danger} sub="Jumia 4+ days overdue" />
        <MetricCard title="Customers" value={customers.length} icon={<Users size={14} />} color="var(--color-primary)" sub="Registered at station" />
      </div>

      {/* Row 2: Revenue Streams Pie + Orders Comparison Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title="Revenue Streams Breakdown" icon={<Activity size={16} color="var(--color-primary)" />}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={revenueStreamData}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {revenueStreamData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} formatter={(v) => `${v.toLocaleString()} EGP`} />
              <Legend
                formatter={(val, entry) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jumia vs Bosta Orders Comparison" icon={<BarChart2 size={16} color={CHART_COLORS.bosta} />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparisonData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{val}</span>} />
              <Bar dataKey="jumia" name="Jumia" fill={CHART_COLORS.jumia} radius={[6, 6, 0, 0]} />
              <Bar dataKey="bosta" name="Bosta" fill={CHART_COLORS.bosta} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Orders Status Pie + SLA Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title="Full Orders Status Distribution" icon={<PackageCheck size={16} color={CHART_COLORS.success} />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersStatusData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {ordersStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Jumia SLA Health" icon={<Clock size={16} color={CHART_COLORS.warning} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '100%' }}>
            {[
              { label: 'On Track (0-1 days)', value: Math.max(0, jumiaInventory.length - jumiaSlaCritical - jumiaSlaNear), color: CHART_COLORS.success },
              { label: 'Warning (2-3 days)', value: jumiaSlaNear, color: CHART_COLORS.warning },
              { label: 'Critical (4+ days)', value: jumiaSlaCritical, color: CHART_COLORS.danger },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px' }}>
                  <div style={{
                    height: '100%',
                    width: jumiaInventory.length > 0 ? `${(s.value / jumiaInventory.length) * 100}%` : '0%',
                    background: s.color,
                    borderRadius: '999px',
                    transition: 'width 0.6s ease',
                    boxShadow: `0 0 8px ${s.color}66`
                  }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {jumiaInventory.length} total in Jumia inventory
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Basata Category Bar + Top Providers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title="Basata Revenue by Category" icon={<Zap size={16} color={CHART_COLORS.basata} />}>
          {basataCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={basataCatData}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="amount" name="Revenue (EGP)" fill={CHART_COLORS.basata} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>No Basata data for this period.</div>
          )}
        </ChartCard>

        <ChartCard title="Top Basata Services by Volume" icon={<BarChart2 size={16} color={CHART_COLORS.basata} />}>
          {basataProviderData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
              {basataProviderData.map((p, i) => {
                const max = basataProviderData[0].count;
                return (
                  <div key={p.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'white', fontSize: '0.85rem' }}>#{i + 1} {p.name}</span>
                      <span style={{ color: CHART_COLORS.basata, fontWeight: 700 }}>{p.count}x</span>
                    </div>
                    <div style={{ height: '5px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px' }}>
                      <div style={{
                        height: '100%',
                        width: `${(p.count / max) * 100}%`,
                        background: `linear-gradient(90deg, ${CHART_COLORS.basata}, ${CHART_COLORS.bosta})`,
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>No Basata transactions yet.</div>
          )}
        </ChartCard>
      </div>

      {/* Row 5: Financial Summary Table */}
      <ChartCard title="Full Financial Summary" icon={<DollarSign size={16} color="var(--color-success)" />}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Revenue</th>
                <th>Orders Handled</th>
                <th>Returns</th>
                <th>Return Amount</th>
                <th>Net Position</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style={{ color: CHART_COLORS.jumia, fontWeight: 700 }}>Jumia</span></td>
                <td style={{ color: CHART_COLORS.success, fontWeight: 600 }}>{jumiaCash.toLocaleString()} EGP</td>
                <td>{jumiaPickedUp.length}</td>
                <td><span style={{ color: CHART_COLORS.danger }}>{jumiaReturned.length}</span></td>
                <td style={{ color: CHART_COLORS.danger }}>{jumiaReturnedAmt.toLocaleString()} EGP</td>
                <td style={{ color: (jumiaCash - jumiaReturnedAmt) >= 0 ? CHART_COLORS.success : CHART_COLORS.danger, fontWeight: 700 }}>
                  {(jumiaCash - jumiaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.bosta, fontWeight: 700 }}>Bosta</span></td>
                <td style={{ color: CHART_COLORS.success, fontWeight: 600 }}>{bostaCash.toLocaleString()} EGP</td>
                <td>{bostaPickedUp.length}</td>
                <td><span style={{ color: CHART_COLORS.danger }}>{bostaReturned.length}</span></td>
                <td style={{ color: CHART_COLORS.danger }}>{bostaReturnedAmt.toLocaleString()} EGP</td>
                <td style={{ color: (bostaCash - bostaReturnedAmt) >= 0 ? CHART_COLORS.success : CHART_COLORS.danger, fontWeight: 700 }}>
                  {(bostaCash - bostaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.basata, fontWeight: 700 }}>Basata POS</span></td>
                <td style={{ color: CHART_COLORS.success, fontWeight: 600 }}>{basataVolume.toLocaleString()} EGP</td>
                <td>{activeBasata.length} trx</td>
                <td>—</td>
                <td>—</td>
                <td style={{ color: CHART_COLORS.success, fontWeight: 700 }}>{basataVolume.toLocaleString()} EGP</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                <td style={{ color: 'white', fontWeight: 800 }}>TOTAL</td>
                <td style={{ color: 'white', fontWeight: 800 }}>{grandTotal.toLocaleString()} EGP</td>
                <td style={{ fontWeight: 700 }}>{jumiaPickedUp.length + bostaPickedUp.length + activeBasata.length}</td>
                <td style={{ color: CHART_COLORS.danger, fontWeight: 700 }}>{jumiaReturned.length + bostaReturned.length}</td>
                <td style={{ color: CHART_COLORS.danger, fontWeight: 700 }}>{(jumiaReturnedAmt + bostaReturnedAmt).toLocaleString()} EGP</td>
                <td style={{ color: CHART_COLORS.success, fontWeight: 800 }}>
                  {(grandTotal - jumiaReturnedAmt - bostaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

    </div>
  );
}
