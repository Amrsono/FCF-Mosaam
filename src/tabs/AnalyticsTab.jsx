import React, { useState } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, PackageCheck, AlertOctagon, Users, DollarSign,
  Zap, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Clock, Phone
} from 'lucide-react';
import ExportActions from '../components/ExportActions';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { exportToPPTX } from '../utils/exportUtils';
import { Presentation } from 'lucide-react';

const CHART_COLORS = {
  jumia: '#f97316',
  bosta: '#6366f1',
  basata: '#22d3ee',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
};

const CustomTooltip = ({ active, payload, label, language }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ 
        background: 'rgba(15,15,30,0.95)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '8px', 
        padding: '0.75rem 1rem',
        textAlign: language === 'ar' ? 'right' : 'left',
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}>
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
  const { orders, customers, basataTransactions, bostaOrders, callLogs, customerReturns } = useDashboard();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [timeframe, setTimeframe] = useState('daily');

  const isAdminAccount = user?.username === 'admin';

  const exportHeaders = [
    { label: t('stream'), accessor: 'group' },
    { label: 'KPI', accessor: 'metric' },
    { label: t('value'), accessor: 'value' }
  ];

  // Time boundary
  const now = new Date();
  const msInDay = 86400000;
  const timeLimitMs = timeframe === 'daily' ? msInDay : timeframe === 'weekly' ? msInDay * 7 : msInDay * 30;
  const thresholdDate = new Date(now.getTime() - timeLimitMs);

  // --- JUMIA ---
  const jumiaPickedUp = orders.filter(o => o.status === 'Picked Up' && new Date(o.pickedUpAt) >= thresholdDate);
  const jumiaInventory = orders.filter(o => o.status === 'Inventory');
  
  // Include Customer Returns that were sent back to Jumia
  const stdReturned = orders.filter(o => o.status === 'Returned' && new Date(o.returnedAt) >= thresholdDate);
  const custReturned = (customerReturns || []).filter(r => r.status === 'Returned to Jumia' && new Date(r.returnedAt) >= thresholdDate);
  const jumiaReturned = [...stdReturned, ...custReturned];
  
  const jumiaCash = jumiaPickedUp.reduce((s, o) => s + o.totalValue, 0);
  const jumiaReturnedAmt = stdReturned.reduce((s, o) => s + o.totalValue, 0); // Customer returns don't have a value in our system
  const getJumiaDailyRate = (order) => {
    const size = (order.size || 'M').toUpperCase();
    if (size === 'S') return 20;
    if (size === 'L') return 40;
    return 40;
  };
  const activePenalties = jumiaInventory.reduce((s, o) => {
    const days = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    if (days < 1) return s;
    return s + getJumiaDailyRate(o) * days;
  }, 0);
  const jumiaSlaCritical = jumiaInventory.filter(o => {
    const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return d >= 5;
  }).length;
  const jumiaSlaNear = jumiaInventory.filter(o => {
    const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return d >= 3 && d < 5;
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

  // --- GRAND TOTAL ---
  const grandTotal = jumiaCash + bostaCash + basataVolume + activePenalties;

  // --- CALLS LOG ANALYTICS ---
  const callsInPeriod = (callLogs || []).filter(l => l.createdAt && new Date(l.createdAt) >= thresholdDate);
  const callsMade   = callsInPeriod.filter(l => l.agentName);
  const callsResolved= callsInPeriod.filter(l => l.resolution);
  const callsClosed  = callsInPeriod.filter(l => l.isClosed);

  // Urgent orders in period (2–3 days) — total received within period from both sources
  const allOrdersInPeriod = [
    ...orders.filter(o => new Date(o.receivedAt) >= thresholdDate),
    ...bostaOrders.filter(o => new Date(o.receivedAt) >= thresholdDate)
  ];
  const urgentInPeriod = allOrdersInPeriod.filter(o => {
    const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
    return o.status === 'Inventory' && d >= 3 && d < 5;
  });
  const coveragePct = urgentInPeriod.length > 0
    ? Math.round((callsMade.length / urgentInPeriod.length) * 100)
    : 100;

  // Calls vs Orders received bar data
  const callsVsOrdersData = [
    {
      name: language === 'ar' ? 'J' : 'J',
      [language === 'ar' ? 'طلبات مستلمة' : 'Orders Received']: orders.filter(o => new Date(o.receivedAt) >= thresholdDate).length,
      [language === 'ar' ? 'مكالمات' : 'Calls Made']: callsInPeriod.filter(l => l.orderSource !== 'bosta').length,
    },
    {
      name: language === 'ar' ? 'بوسطة' : 'Bosta',
      [language === 'ar' ? 'طلبات مستلمة' : 'Orders Received']: bostaOrders.filter(o => new Date(o.receivedAt) >= thresholdDate).length,
      [language === 'ar' ? 'مكالمات' : 'Calls Made']: callsInPeriod.filter(l => l.orderSource === 'bosta').length,
    },
  ];
  const ordersReceivedKey = language === 'ar' ? 'طلبات مستلمة' : 'Orders Received';
  const callsMadeKey      = language === 'ar' ? 'مكالمات'       : 'Calls Made';

  const handleExportPPTX = () => {
    const analytics = {
      jumia: {
        pickedUpCount: jumiaPickedUp.length,
        cash: jumiaCash,
        returnedCount: stdReturned.length,
        returnedAmt: jumiaReturnedAmt,
        penalties: activePenalties
      },
      bosta: {
        pickedUpCount: bostaPickedUp.length,
        cash: bostaCash,
        returnedCount: bostaReturned.length,
        returnedAmt: bostaReturnedAmt
      },
      basata: {
        volume: basataVolume,
        categoryData: basataCatData
      },
      calls: {
        total: callsInPeriod.length,
        taken: callsMade.length,
        resolved: callsResolved.length,
        coverage: coveragePct
      },
      grandTotal: grandTotal - jumiaReturnedAmt - bostaReturnedAmt
    };

    exportToPPTX(analytics, `FCF_Master_Report_${timeframe}`, language);
  };

  // Resolution breakdown pie
  const resolutionCounts = {};
  callsResolved.forEach(l => { resolutionCounts[l.resolution] = (resolutionCounts[l.resolution] || 0) + 1; });
  const RESOLUTION_DISPLAY = {
    coming_pickup:   language === 'ar' ? '✅ سيأتي للاستلام' : '✅ Coming to pick up',
    will_cancel:     language === 'ar' ? '❌ سيلغي' : '❌ Will cancel',
    no_answer:       language === 'ar' ? '📵 لا رد' : '📵 No answer',
    declined:        language === 'ar' ? '❓ رفض' : '❓ Declined',
    no_longer_wants: language === 'ar' ? '🚫 لا يريد' : '🚫 No longer wants',
  };
  const RES_COLORS = ['#22c55e','#ef4444','#f59e0b','#a855f7','#f97316'];
  const resolutionPieData = Object.keys(resolutionCounts).map((key, i) => ({
    name: RESOLUTION_DISPLAY[key] || key,
    value: resolutionCounts[key],
    color: RES_COLORS[i % RES_COLORS.length]
  }));

  // --- CHART DATA ---
  const revenueStreamData = [
    { name: t('jumia'), value: jumiaCash, color: CHART_COLORS.jumia },
    { name: t('bosta'), value: bostaCash, color: CHART_COLORS.bosta },
    { name: t('basata'), value: basataVolume, color: CHART_COLORS.basata },
    { name: t('penalties'), value: activePenalties, color: CHART_COLORS.warning },
  ];

  const ordersStatusData = [
    { name: `${t('jumia')} ${t('pickedUpStatus')}`, value: jumiaPickedUp.length, color: CHART_COLORS.success },
    { name: `${t('jumia')} ${t('inventoryStatus')}`, value: jumiaInventory.length, color: CHART_COLORS.warning },
    { name: `${t('jumia')} ${t('returnedStatus')}`, value: jumiaReturned.length, color: CHART_COLORS.danger },
    { name: `${t('bosta')} ${t('pickedUpStatus')}`, value: bostaPickedUp.length, color: CHART_COLORS.bosta },
    { name: `${t('bosta')} ${t('inventoryStatus')}`, value: bostaInventory.length, color: '#a5b4fc' },
    { name: `${t('bosta')} ${t('returnedStatus')}`, value: bostaReturned.length, color: '#f87171' },
  ].filter(d => d.value > 0);

  const basataCatData = Object.keys(basataCategories).map(cat => ({
    name: cat,
    amount: basataCategories[cat],
  }));

  const basataProviderData = Object.keys(basataProviders)
    .sort((a, b) => basataProviders[b] - basataProviders[a])
    .slice(0, 6)
    .map(p => ({ name: p, count: basataProviders[p] }));

  const comparisonData = [
    { name: language === 'ar' ? 'المدخلات' : 'Inventory', jumia: jumiaInventory.length, bosta: bostaInventory.length },
    { name: t('pickedUpStatus'), jumia: jumiaPickedUp.length, bosta: bostaPickedUp.length },
    { name: t('returnedStatus'), jumia: jumiaReturned.length, bosta: bostaReturned.length },
  ];

  // Metric Card
  const MetricCard = ({ title, value, sub, icon, color, trend, trendDir }) => (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', [language === 'ar' ? 'borderRight' : 'borderLeft']: `3px solid ${color || 'var(--border-color)'}` }}>
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

  // Admin Transaction Counters Logic
  const getTransactionCount = (periodMs) => {
    const limit = new Date(Date.now() - periodMs);
    
    const jTrx = orders.filter(o => 
      (o.status === 'Picked Up' && o.pickedUpAt && new Date(o.pickedUpAt) >= limit) ||
      (o.status === 'Returned' && o.returnedAt && new Date(o.returnedAt) >= limit)
    ).length;
    
    const bTrx = bostaOrders.filter(o => 
      (o.status === 'Picked Up' && o.pickedUpAt && new Date(o.pickedUpAt) >= limit) ||
      (o.status === 'Returned' && o.returnedAt && new Date(o.returnedAt) >= limit)
    ).length;
    
    const basataTrx = basataTransactions.filter(t => t.performedAt && new Date(t.performedAt) >= limit).length;
    
    const custRetTrx = (customerReturns || []).filter(r => 
      r.status === 'Returned to Jumia' && r.returnedAt && new Date(r.returnedAt) >= limit
    ).length;

    return jTrx + bTrx + basataTrx + custRetTrx;
  };

  const dailyCount = isAdminAccount ? getTransactionCount(86400000) : 0;
  const weeklyCount = isAdminAccount ? getTransactionCount(86400000 * 7) : 0;
  const monthlyCount = isAdminAccount ? getTransactionCount(86400000 * 30) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', [language === 'ar' ? 'paddingLeft' : 'paddingRight']: '0.5rem' }}>

      {/* Sticky Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', margin: 0, fontSize: '1.25rem' }}>
          <TrendingUp size={22} color="var(--color-primary)" /> {t('analytics')}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap' }}>
            {['daily', 'weekly', 'monthly'].map(tf => (
              <button key={tf} className={`btn ${timeframe === tf ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setTimeframe(tf)}>
                {tf === 'daily' ? (language === 'ar' ? 'يومي' : 'Daily') : tf === 'weekly' ? (language === 'ar' ? 'أسبوعي' : 'Weekly') : (language === 'ar' ? 'شهري' : 'Monthly')}
              </button>
            ))}
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem',
            [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '0.5rem', 
            [language === 'ar' ? 'borderRight' : 'borderLeft']: '1px solid var(--border-color)' 
          }}>
            <button
              className="btn btn-outline"
              style={{ 
                borderColor: 'var(--color-primary)', 
                color: 'var(--color-primary)',
                background: 'rgba(120, 100, 255, 0.05)',
                gap: '0.5rem',
                fontSize: '0.85rem',
                padding: '0.4rem 0.8rem'
              }}
              onClick={handleExportPPTX}
            >
              <Presentation size={16} />
              {language === 'ar' ? 'تقرير PPTX' : 'Master PPTX'}
            </button>
            <ExportActions
              data={[
                { group: 'Overview', metric: 'Grand Total Revenue', value: `${grandTotal} EGP` },
                { group: ' J ', metric: 'Cash Collected', value: `${jumiaCash} EGP` },
                { group: ' J ', metric: 'Picked Up', value: jumiaPickedUp.length },
                { group: ' J ', metric: 'Returned', value: jumiaReturned.length },
                { group: ' J ', metric: 'Penalties Pool', value: `${activePenalties} EGP` },
                { group: 'Bosta', metric: 'Cash Collected', value: `${bostaCash} EGP` },
                { group: 'Bosta', metric: 'Picked Up', value: bostaPickedUp.length },
                { group: 'Bosta', metric: 'Returned', value: bostaReturned.length },
                { group: 'Basata', metric: 'POS Volume', value: `${basataVolume} EGP` },
                { group: 'Basata', metric: 'Transactions', value: activeBasata.length },
                { group: 'Calls Log', metric: 'Total Calls Created', value: callsInPeriod.length },
                { group: 'Calls Log', metric: 'Calls Resolved', value: callsResolved.length },
                { group: 'Calls Log', metric: 'Calls Closed', value: callsClosed.length },
                { group: 'Calls Log', metric: 'Coverage Rate', value: `${coveragePct}%` },
              ]}
              headers={exportHeaders}
              filename={`Analytics_${timeframe}`}
              title={`${t('analytics')} (${timeframe.toUpperCase()})`}
            />
          </div>
        </div>
      </div>

      {/* Grand Revenue Hero */}
      <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(249,115,22,0.1))', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <Activity size={14} /> {language === 'ar' ? 'إجمالي إيرادات المحطة' : 'Total Station Revenue'}
            </div>
            <div style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {grandTotal.toLocaleString()}
              <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', [language === 'ar' ? 'marginRight' : 'marginLeft']: '0.5rem' }}>EGP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {[
              { label: t('jumia'), value: jumiaCash, color: CHART_COLORS.jumia },
              { label: t('bosta'), value: bostaCash, color: CHART_COLORS.bosta },
              { label: t('basata'), value: basataVolume, color: CHART_COLORS.basata },
              { label: t('penalties'), value: activePenalties, color: CHART_COLORS.warning },
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
        <MetricCard title={`${t('jumia')} ${t('cash')}`} value={`${jumiaCash.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.jumia} sub={language === 'ar' ? `${jumiaPickedUp.length} طلب مستلم` : `${jumiaPickedUp.length} orders picked up`} />
        <MetricCard title={`${t('bosta')} ${t('cash')}`} value={`${bostaCash.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.bosta} sub={language === 'ar' ? `${bostaPickedUp.length} طلب مستلم` : `${bostaPickedUp.length} orders picked up`} />
        <MetricCard title={`${t('basata')} POS`} value={`${basataVolume.toLocaleString()} EGP`} icon={<Zap size={14} />} color={CHART_COLORS.basata} sub={language === 'ar' ? `${activeBasata.length} عملية` : `${activeBasata.length} transactions`} />
        <MetricCard title={t('parkedPenalties')} value={`${activePenalties} EGP`} icon={<AlertOctagon size={14} />} color={CHART_COLORS.warning} sub={language === 'ar' ? `${jumiaInventory.length} طلب مخزن` : `${jumiaInventory.length} parked orders`} />
        <MetricCard title={language === 'ar' ? 'حالة SLA حرجة' : 'SLA Critical'} value={jumiaSlaCritical} icon={<ShieldAlert size={14} />} color={CHART_COLORS.danger} sub={language === 'ar' ? ' J  5+ أيام تأخير' : ' J  5+ days overdue'} />
        <MetricCard title={t('customers')} value={customers.length} icon={<Users size={14} />} color="var(--color-primary)" sub={language === 'ar' ? 'مسجلين في المحطة' : 'Registered at station'} />
      </div>

      {/* Row 2: Revenue Streams Pie + Orders Comparison Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'تحليل مصادر الإيرادات' : 'Revenue Streams Breakdown'} icon={<Activity size={16} color="var(--color-primary)" />}>
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
              <Tooltip content={<CustomTooltip language={language} />} formatter={(v) => `${v.toLocaleString()} EGP`} />
              <Legend
                formatter={(val, entry) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={language === 'ar' ? 'مقارنة طلبات  J  وبوسطة' : ' J  vs Bosta Orders Comparison'} icon={<BarChart2 size={16} color={CHART_COLORS.bosta} />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparisonData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{val}</span>} />
              <Bar dataKey="jumia" name={t('jumia')} fill={CHART_COLORS.jumia} radius={[6, 6, 0, 0]} />
              <Bar dataKey="bosta" name={t('bosta')} fill={CHART_COLORS.bosta} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Orders Status Pie + SLA Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'توزيع حالة الطلبات الكاملة' : 'Full Orders Status Distribution'} icon={<PackageCheck size={16} color={CHART_COLORS.success} />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersStatusData} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={language === 'ar' ? [6, 0, 0, 6] : [0, 6, 6, 0]}>
                {ordersStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={language === 'ar' ? 'صحة SLA لـ J ' : ' J  SLA Health'} icon={<Clock size={16} color={CHART_COLORS.warning} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '100%' }}>
            {[
              { label: `${t('onTrack')} (0-2 ${language === 'ar' ? 'أيام' : 'days'})`, value: Math.max(0, jumiaInventory.length - jumiaSlaCritical - jumiaSlaNear), color: CHART_COLORS.success },
              { label: `${t('warning3Days')}`, value: jumiaSlaNear, color: CHART_COLORS.warning },
              { label: t('critical5Days'), value: jumiaSlaCritical, color: CHART_COLORS.danger },
            ].map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{s.label}</span>
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
              {language === 'ar' ? `إجمالي ${jumiaInventory.length} في مخزون  J ` : `${jumiaInventory.length} total in  J  inventory`}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Basata Category Bar + Top Providers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'إيرادات بساطة حسب الفئة' : 'Basata Revenue by Category'} icon={<Zap size={16} color={CHART_COLORS.basata} />}>
          {basataCatData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={basataCatData}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="amount" name={t('amount')} fill={CHART_COLORS.basata} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>{t('noData')}</div>
          )}
        </ChartCard>

        <ChartCard title={language === 'ar' ? 'أفضل خدمات بساطة حسب الحجم' : 'Top Basata Services by Volume'} icon={<BarChart2 size={16} color={CHART_COLORS.basata} />}>
          {basataProviderData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
              {basataProviderData.map((p, i) => {
                const max = basataProviderData[0].count;
                return (
                  <div key={p.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>#{i + 1} {p.name}</span>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '180px', color: 'var(--text-muted)' }}>{t('noData')}</div>
          )}
        </ChartCard>
      </div>

      {/* Row 5: Financial Summary Table */}
      <ChartCard title={language === 'ar' ? 'الملخص المالي الكامل' : 'Full Financial Summary'} icon={<DollarSign size={16} color="var(--color-success)" />}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('stream')}</th>
                <th>{language === 'ar' ? 'الإيرادات' : 'Revenue'}</th>
                <th>{language === 'ar' ? 'الطلبات المعالجة' : 'Orders Handled'}</th>
                <th>{t('returnedStatus')}</th>
                <th>{language === 'ar' ? 'مبلغ المرتجع' : 'Return Amount'}</th>
                <th>{language === 'ar' ? 'صافي المركز' : 'Net Position'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style={{ color: CHART_COLORS.jumia, fontWeight: 700 }}>{t('jumia')}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{jumiaCash.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{jumiaPickedUp.length}</td>
                <td style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--color-danger)' }}>{jumiaReturned.length}</span></td>
                <td style={{ color: 'var(--color-danger)' }}>{jumiaReturnedAmt.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  {(jumiaCash - jumiaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.bosta, fontWeight: 700 }}>{t('bosta')}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bostaCash.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{bostaPickedUp.length}</td>
                <td style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--color-danger)' }}>{bostaReturned.length}</span></td>
                <td style={{ color: 'var(--color-danger)' }}>{bostaReturnedAmt.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  {(bostaCash - bostaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.basata, fontWeight: 700 }}>{t('basata')} POS</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{basataVolume.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{activeBasata.length} {language === 'ar' ? 'عملية' : 'trx'}</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{basataVolume.toLocaleString()} EGP</td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.warning, fontWeight: 700 }}>{t('penalties')}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activePenalties.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{jumiaInventory.length} {language === 'ar' ? 'طلب مخزن' : 'parked'}</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{activePenalties.toLocaleString()} EGP</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-overlay)' }}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{grandTotal.toLocaleString()} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{jumiaPickedUp.length + bostaPickedUp.length + activeBasata.length}</td>
                <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{jumiaReturned.length + bostaReturned.length}</td>
                <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{(jumiaReturnedAmt + bostaReturnedAmt).toLocaleString()} EGP</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 800 }}>
                  {(grandTotal - jumiaReturnedAmt - bostaReturnedAmt).toLocaleString()} EGP
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Row 6: Calls Log Analytics */}
      <ChartCard
        title={language === 'ar' ? '📞 تحليلات سجل المكالمات' : '📞 Calls Log Analytics'}
        icon={<Phone size={16} color="var(--color-warning)" />}
      >
        {/* Metric strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {[
            { label: language === 'ar' ? 'مكالمات في الفترة' : 'Calls This Period',  value: callsInPeriod.length,   color: 'var(--color-warning)' },
            { label: language === 'ar' ? 'تم إجراؤها'        : 'Calls Made',         value: callsMade.length,      color: 'var(--color-primary)' },
            { label: language === 'ar' ? 'تم الحل'            : 'Resolved',            value: callsResolved.length,   color: 'var(--color-success)' },
            { label: language === 'ar' ? 'مغلقة'              : 'Closed',              value: callsClosed.length,     color: 'var(--text-muted)' },
            { label: language === 'ar' ? 'نسبة التغطية'       : 'Coverage Rate',       value: `${coveragePct}%`,      color: coveragePct >= 80 ? 'var(--color-success)' : coveragePct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', borderLeft: `3px solid ${m.color}` }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{m.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,300px), 1fr))', gap: '1rem' }}>
          {/* Calls vs Orders received grouped bar */}
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              {language === 'ar' ? 'مكالمات مقابل طلبات مستلمة' : 'Calls Made vs Orders Received'}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={callsVsOrdersData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'var(--bg-overlay)' }} />
                <Legend formatter={val => <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>{val}</span>} />
                <Bar dataKey={ordersReceivedKey} fill={CHART_COLORS.jumia}  radius={[6,6,0,0]} />
                <Bar dataKey={callsMadeKey}      fill={CHART_COLORS.warning} radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resolution breakdown pie */}
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
              {language === 'ar' ? 'توزيع نتائج المكالمات' : 'Call Resolution Breakdown'}
            </div>
            {resolutionPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={resolutionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {resolutionPieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip language={language} />} />
                  <Legend formatter={val => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{val}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {language === 'ar' ? 'لا توجد مكالمات محلولة بعد' : 'No resolved calls yet in this period'}
              </div>
            )}
          </div>
        </div>
      </ChartCard>

      {/* Admin Transaction Counters */}
      {isAdminAccount && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--color-primary)', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
              <Activity size={18} color="white" />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('transactionCounters')}</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.03))',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('dailyTransactions')}</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{dailyCount.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '1rem', borderRadius: '1.25rem', display: 'flex', position: 'relative', zIndex: 1 }}>
                <Zap size={32} color="#22c55e" strokeWidth={2.5} />
              </div>
            </div>
            
            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(99, 102, 241, 0.03))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('weeklyTransactions')}</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{weeklyCount.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '1rem', borderRadius: '1.25rem', display: 'flex', position: 'relative', zIndex: 1 }}>
                <BarChart2 size={32} color="#6366f1" strokeWidth={2.5} />
              </div>
            </div>

            <div className="glass-panel" style={{ 
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.15), rgba(249, 115, 22, 0.03))',
              border: '1px solid rgba(249, 115, 22, 0.2)',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '80px', height: '80px', background: 'rgba(249, 115, 22, 0.05)', borderRadius: '50%', filter: 'blur(20px)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('monthlyTransactions')}</div>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{monthlyCount.toLocaleString()}</div>
              </div>
              <div style={{ background: 'rgba(249, 115, 22, 0.15)', padding: '1rem', borderRadius: '1.25rem', display: 'flex', position: 'relative', zIndex: 1 }}>
                <TrendingUp size={32} color="#f97316" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
