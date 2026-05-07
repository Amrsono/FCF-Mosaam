import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, PackageCheck, AlertOctagon, Users, DollarSign,
  Zap, BarChart2, Activity,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Clock, Phone,
  Calendar, RotateCcw
} from 'lucide-react';
import ExportActions from '../components/ExportActions';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { exportToPPTX } from '../utils/exportUtils';
import { Presentation } from 'lucide-react';

const normalizeOutlet = (val) => {
  if (!val) return 'eltalg';
  const v = String(val).toLowerCase().trim();
  if (v === 'eltalg' || v.includes('banha 1') || v.includes('banha1') || v.includes('ثلج') || v.includes('تلج')) return 'eltalg';
  if (v === 'tegara' || v.includes('banha 2') || v.includes('banha2') || v.includes('تجارة') || v.includes('تجاره')) return 'tegara';
  if (v === 'mostashfa' || v.includes('banha 3') || v.includes('banha3') || v.includes('مستشفى') || v.includes('مستشفي')) return 'mostashfa';
  return val;
};

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
  const { orders, customers, basataTransactions, bostaOrders, callLogs, customerReturns, calculatePenalty, globalFilters, updateFilters } = useDashboard();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const formatDate = (date) => {
    const options = { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return formatter.format(date); // en-CA gives YYYY-MM-DD
  };

  const f = globalFilters.analytics;
  const startDate = f.dateStart;
  const endDate = f.dateEnd;
  const selectedOutlet = f.outlet;
  const timeframe = f.timeframe;

  const setStartDate = (val) => updateFilters('analytics', { dateStart: val });
  const setEndDate = (val) => updateFilters('analytics', { dateEnd: val });
  const setSelectedOutlet = (val) => updateFilters('analytics', { outlet: val });
  const setTimeframe = (val) => updateFilters('analytics', { timeframe: val });

  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    const now = new Date();
    let start = new Date();
    
    if (tf === 'daily') {
      // today is already handled by start = new Date()
    } else if (tf === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (tf === 'monthly') {
      start.setDate(now.getDate() - 30);
    }
    
    setStartDate(formatDate(start));
    setEndDate(formatDate(now));
  };

  const isAdminAccount = user?.username === 'admin';

  const exportHeaders = [
    { label: t('stream'), accessor: 'group' },
    { label: 'KPI', accessor: 'metric' },
    { label: t('value'), accessor: 'value' }
  ];

  // Time boundary
  // Time boundary - Parse YYYY-MM-DD as Egypt Local
  const parseEgyptDate = (dateStr, setToEnd) => {
    if (!dateStr) return setToEnd ? new Date(2100, 0, 1) : new Date(2000, 0, 1);
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (setToEnd) {
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const startLimit = parseEgyptDate(startDate, false);
  const endLimit = parseEgyptDate(endDate, true);

  const isInRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startLimit && d <= endLimit;
  };

  const matchesOutlet = (o) => {
    if (selectedOutlet === 'All') return true;
    return normalizeOutlet(o.outlet) === selectedOutlet;
  };

  const stats = useMemo(() => {
    // --- JUMIA ---
    const jumiaPickedUp = orders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt) && matchesOutlet(o));
    const jumiaInventory = orders.filter(o => o.status === 'Inventory' && isInRange(o.receivedAt) && matchesOutlet(o));
    const jumiaReceived = orders.filter(o => isInRange(o.receivedAt) && matchesOutlet(o));
    
    const stdReturned = orders.filter(o => o.status === 'Returned' && isInRange(o.returnedAt) && matchesOutlet(o));
    const custReturned = (customerReturns || []).filter(r => r.status === 'Returned to Jumia' && isInRange(r.returnedAt) && (selectedOutlet === 'All' || normalizeOutlet(r.outlet) === selectedOutlet));
    const jumiaReturned = [...stdReturned, ...custReturned];
    const jumiaCancelled = orders.filter(o => o.status === 'Cancelled' && isInRange(o.returnedAt) && matchesOutlet(o));
    
    const jumiaCash = jumiaPickedUp.reduce((s, o) => s + o.totalValue, 0);
    const jumiaReturnedAmt = stdReturned.reduce((s, o) => s + o.totalValue, 0);

    const getJumiaCharge = (size) => {
      const s = (size || 'M').toUpperCase();
      if (s === 'S') return 18;
      if (s === 'L') return 45;
      return 30;
    };
    const jumiaProfit = jumiaPickedUp.reduce((s, o) => s + getJumiaCharge(o.size), 0);

    // --- BOSTA ---
    const bostaInventory = bostaOrders.filter(o => o.status === 'Inventory' && isInRange(o.receivedAt) && matchesOutlet(o));
    const activePenalties = [...jumiaInventory, ...bostaInventory].reduce((s, o) => {
      return s + (calculatePenalty ? calculatePenalty(o) : 0);
    }, 0);
    const jumiaSlaCritical = jumiaInventory.filter(o => {
      const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
      return d >= 5;
    }).length;
    const jumiaSlaNear = jumiaInventory.filter(o => {
      const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
      return d >= 3 && d < 5;
    }).length;
    
    const jumiaPayTotal = jumiaPickedUp.filter(o => o.paymentMethod?.toLowerCase().includes('jumia')).reduce((s, o) => s + o.totalValue, 0);
    const jumiaCardTotal = jumiaPickedUp.filter(o => o.paymentMethod?.toLowerCase().includes('card') || o.paymentMethod?.toLowerCase().includes('visa')).reduce((s, o) => s + o.totalValue, 0);
    const jumiaCashTotal = jumiaPickedUp.filter(o => !o.paymentMethod || o.paymentMethod?.toLowerCase() === 'cash').reduce((s, o) => s + o.totalValue, 0);
    
    const jumiaPaymentData = [
      { name: t('cash'), value: jumiaCashTotal, color: '#f97316' },
      { name: t('creditCard'), value: jumiaCardTotal, color: '#22c55e' },
      { name: t('jumiaPay'), value: jumiaPayTotal, color: '#6366f1' },
    ].filter(d => d.value > 0);

    const bostaPickedUp = bostaOrders.filter(o => o.status === 'Picked Up' && isInRange(o.pickedUpAt) && matchesOutlet(o));
    const bostaReceived = bostaOrders.filter(o => isInRange(o.receivedAt) && matchesOutlet(o));
    const bostaReturned = bostaOrders.filter(o => o.status === 'Returned' && isInRange(o.returnedAt) && matchesOutlet(o));
    const bostaCancelled = bostaOrders.filter(o => o.status === 'Cancelled' && isInRange(o.returnedAt) && matchesOutlet(o));
    const bostaCash = bostaPickedUp.reduce((s, o) => s + o.totalValue, 0);
    const bostaReturnedAmt = bostaReturned.reduce((s, o) => s + o.totalValue, 0);
    const bostaProfit = bostaPickedUp.length * 10;

    const getSizes = (list) => {
      return list.reduce((acc, o) => {
        const s = (o.size || 'M').toUpperCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, { S: 0, M: 0, L: 0 });
    };
    const jumiaSizes = getSizes(jumiaPickedUp);
    const jumiaInventorySizes = getSizes(jumiaInventory);
    const bostaSizes = getSizes(bostaPickedUp);
    const bostaInventorySizes = getSizes(bostaInventory);

    // --- BASATA ---
    const activeBasata = basataTransactions.filter(t => isInRange(t.performedAt) && matchesOutlet(t));
    const basataVolume = activeBasata.reduce((s, t) => s + t.amount, 0);
    const basataCategories = activeBasata.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
    const basataProviders = activeBasata.reduce((acc, t) => {
      acc[t.serviceProvider] = (acc[t.serviceProvider] || 0) + 1;
      return acc;
    }, {});

    const getByOutlet = (list, key = 'amount') => {
      return list.reduce((acc, item) => {
        const outlet = normalizeOutlet(item.outlet);
        if (typeof key === 'function') acc[outlet] = (acc[outlet] || 0) + key(item);
        else acc[outlet] = (acc[outlet] || 0) + (item[key] || 0);
        return acc;
      }, { eltalg: 0, tegara: 0, mostashfa: 0 });
    };

    const basataByOutlet = getByOutlet(activeBasata, 'amount');
    const basataCountByOutlet = getByOutlet(activeBasata, () => 1);
    const jumiaPickedUpByOutlet = getByOutlet(jumiaPickedUp, () => 1);
    const jumiaInventoryByOutlet = getByOutlet(jumiaInventory, () => 1);
    const jumiaProfitByOutlet = getByOutlet(jumiaPickedUp, (o) => getJumiaCharge(o.size));
    const bostaProfitByOutlet = getByOutlet(bostaPickedUp, () => 10);

    const grandTotal = jumiaProfit + bostaProfit + basataVolume + activePenalties;

    // --- CALLS LOG ANALYTICS ---
    const callsInPeriod = (callLogs || []).filter(l => isInRange(l.createdAt) && (selectedOutlet === 'All' || normalizeOutlet(l.outlet) === selectedOutlet));
    const callsMade   = callsInPeriod.filter(l => l.agentName);
    const callsResolved= callsInPeriod.filter(l => l.resolution);
    const callsClosed  = callsInPeriod.filter(l => l.isClosed);

    const allOrdersInPeriod = [
      ...orders.filter(o => isInRange(o.receivedAt) && matchesOutlet(o)),
      ...bostaOrders.filter(o => isInRange(o.receivedAt) && matchesOutlet(o))
    ];
    const urgentInPeriod = allOrdersInPeriod.filter(o => {
      const d = Math.floor(Math.abs(new Date() - new Date(o.receivedAt)) / 86400000);
      return o.status === 'Inventory' && d >= 3 && d < 5;
    });
    const coveragePct = urgentInPeriod.length > 0 ? Math.round((callsMade.length / urgentInPeriod.length) * 100) : 100;

    const basataCatData = Object.keys(basataCategories).map(cat => ({
      name: cat,
      amount: basataCategories[cat],
    }));

    const resolutionCounts = {};
    callsResolved.forEach(l => { resolutionCounts[l.resolution] = (resolutionCounts[l.resolution] || 0) + 1; });
    const RESOLUTION_DISPLAY = {
      coming_pickup: language === 'ar' ? '✅ سيأتي للاستلام' : '✅ Coming to pick up',
      will_cancel: language === 'ar' ? '❌ سيلغي' : '❌ Will cancel',
      no_answer: language === 'ar' ? '📵 لا رد' : '📵 No answer',
      declined: language === 'ar' ? '❓ رفض' : '❓ Declined',
      no_longer_wants: language === 'ar' ? '🚫 لا يريد' : '🚫 No longer wants',
    };
    const RES_COLORS = ['#22c55e','#ef4444','#f59e0b','#a855f7','#f97316'];
    const resolutionPieData = Object.keys(resolutionCounts).map((key, i) => ({
      name: RESOLUTION_DISPLAY[key] || key,
      value: resolutionCounts[key],
      color: RES_COLORS[i % RES_COLORS.length]
    }));

    const revenueStreamData = [
      { name: t('jumia'), value: jumiaProfit, color: CHART_COLORS.jumia },
      { name: t('bosta'), value: bostaProfit, color: CHART_COLORS.bosta },
      { name: t('basata'), value: basataVolume, color: CHART_COLORS.basata },
      { name: t('penalties'), value: activePenalties, color: CHART_COLORS.warning },
    ];

    const ordersStatusData = [
      { name: t('pickedFromJumia'), value: jumiaInventory.length, color: CHART_COLORS.warning },
      { name: t('pickedUpByCustomer'), value: jumiaPickedUp.length, color: CHART_COLORS.success },
      { name: `${t('jumia')} ${t('returnedStatus')}`, value: jumiaReturned.length, color: CHART_COLORS.danger },
      { name: `${t('bosta')} ${t('pickedUpStatus')}`, value: bostaPickedUp.length, color: CHART_COLORS.bosta },
      { name: `${t('bosta')} ${t('inventoryStatus')}`, value: bostaInventory.length, color: '#a5b4fc' },
      { name: `${t('bosta')} ${t('returnedStatus')}`, value: bostaReturned.length, color: '#f87171' },
    ].filter(d => d.value > 0);

    const basataByOutletData = [
      { name: t('eltalg'), amount: basataByOutlet.eltalg, color: CHART_COLORS.basata },
      { name: t('tegara'), amount: basataByOutlet.tegara, color: '#06b6d4' },
      { name: t('mostashfa'), amount: basataByOutlet.mostashfa, color: '#0891b2' },
    ].filter(d => d.amount > 0);

    const jumiaProfitByOutletData = [
      { name: t('eltalg'), amount: jumiaProfitByOutlet.eltalg, color: CHART_COLORS.jumia },
      { name: t('tegara'), amount: jumiaProfitByOutlet.tegara, color: '#fb923c' },
      { name: t('mostashfa'), amount: jumiaProfitByOutlet.mostashfa, color: '#ea580c' },
    ].filter(d => d.amount > 0);

    const comparisonData = [
      { name: language === 'ar' ? 'المدخلات' : 'Inventory', jumia: jumiaInventory.length, bosta: bostaInventory.length },
      { name: t('pickedUpByCustomer'), jumia: jumiaPickedUp.length, bosta: bostaPickedUp.length },
      { name: t('returnedStatus'), jumia: jumiaReturned.length, bosta: bostaReturned.length },
    ];

    const getTransactionCount = (periodMs) => {
      const limit = new Date(Date.now() - periodMs);
      const jTrx = orders.filter(o => (o.status === 'Picked Up' && o.pickedUpAt && new Date(o.pickedUpAt) >= limit) || (o.status === 'Returned' && o.returnedAt && new Date(o.returnedAt) >= limit)).length;
      const bTrx = bostaOrders.filter(o => (o.status === 'Picked Up' && o.pickedUpAt && new Date(o.pickedUpAt) >= limit) || (o.status === 'Returned' && o.returnedAt && new Date(o.returnedAt) >= limit)).length;
      const basataTrx = basataTransactions.filter(t => t.performedAt && new Date(t.performedAt) >= limit).length;
      return jTrx + bTrx + basataTrx;
    };

    return {
      jumiaPickedUp, jumiaInventory, jumiaReceived, stdReturned, jumiaReturned, jumiaCancelled, jumiaCash, jumiaReturnedAmt, jumiaProfit,
      bostaInventory, activePenalties, jumiaSlaCritical, jumiaSlaNear, jumiaPayTotal, jumiaCardTotal, jumiaCashTotal, jumiaPaymentData,
      bostaPickedUp, bostaReceived, bostaReturned, bostaCancelled, bostaCash, bostaReturnedAmt, bostaProfit,
      jumiaSizes, jumiaInventorySizes, bostaSizes, bostaInventorySizes,
      activeBasata, basataVolume, basataCategories, basataProviders, basataByOutlet, basataCountByOutlet,
      jumiaPickedUpByOutlet, jumiaInventoryByOutlet, jumiaProfitByOutlet, bostaProfitByOutlet,
      grandTotal, callsInPeriod, callsMade, callsResolved, callsClosed, coveragePct,
      basataCatData, resolutionPieData, revenueStreamData, ordersStatusData, basataByOutletData, jumiaProfitByOutletData, comparisonData,
      dailyCount: isAdminAccount ? getTransactionCount(86400000) : 0,
      weeklyCount: isAdminAccount ? getTransactionCount(86400000 * 7) : 0,
      monthlyCount: isAdminAccount ? getTransactionCount(86400000 * 30) : 0
    };
  }, [orders, bostaOrders, basataTransactions, callLogs, customerReturns, selectedOutlet, startDate, endDate, isAdminAccount, language, calculatePenalty]);

  const {
    jumiaPickedUp, jumiaInventory, jumiaReceived, stdReturned, jumiaReturned, jumiaCancelled, jumiaCash, jumiaReturnedAmt, jumiaProfit,
    bostaInventory, activePenalties, jumiaSlaCritical, jumiaSlaNear, jumiaPayTotal, jumiaCardTotal, jumiaCashTotal, jumiaPaymentData,
    bostaPickedUp, bostaReceived, bostaReturned, bostaCancelled, bostaCash, bostaReturnedAmt, bostaProfit,
    jumiaSizes, jumiaInventorySizes, bostaSizes, bostaInventorySizes,
    activeBasata, basataVolume, basataCategories, basataProviders, basataByOutlet, basataCountByOutlet,
    jumiaPickedUpByOutlet, jumiaInventoryByOutlet, jumiaProfitByOutlet, bostaProfitByOutlet,
    grandTotal, callsInPeriod, callsMade, callsResolved, callsClosed, coveragePct,
    basataCatData, resolutionPieData, revenueStreamData, ordersStatusData, basataByOutletData, jumiaProfitByOutletData, comparisonData,
    dailyCount, weeklyCount, monthlyCount
  } = stats;

  const getCashByOutlet = (list) => {
    return list.reduce((acc, o) => {
      const outlet = normalizeOutlet(o.outlet);
      acc[outlet] = (acc[outlet] || 0) + o.totalValue;
      return acc;
    }, { eltalg: 0, tegara: 0, mostashfa: 0 });
  };

  const handleExportPPTX = () => {
    const analytics = {
      jumia: {
        pickedUpCount: jumiaPickedUp.length,
        cash: jumiaCash,
        profit: jumiaProfit,
        cashTotal: jumiaCashTotal,
        cardTotal: jumiaCardTotal,
        jumiaPayTotal: jumiaPayTotal,
        returnedCount: stdReturned.length,
        returnedAmt: jumiaReturnedAmt,
        penalties: activePenalties,
        sizes: jumiaSizes,
        inventorySizes: jumiaInventorySizes,
        inventoryCount: jumiaInventory.length,
        cashByOutlet: getCashByOutlet(jumiaPickedUp),
        profitByOutlet: jumiaProfitByOutlet
      },
      bosta: {
        pickedUpCount: bostaPickedUp.length,
        cash: bostaCash,
        profit: bostaProfit,
        returnedCount: bostaReturned.length,
        returnedAmt: bostaReturnedAmt,
        sizes: bostaSizes,
        inventorySizes: bostaInventorySizes,
        inventoryCount: bostaInventory.length,
        cashByOutlet: getCashByOutlet(bostaPickedUp),
        profitByOutlet: bostaProfitByOutlet
      },
      basata: {
        volume: basataVolume,
        categoryData: basataCatData,
        volumeByOutlet: basataByOutlet
      },
      calls: {
        total: callsInPeriod.length,
        taken: callsMade.length,
        resolved: callsResolved.length,
        coverage: coveragePct
      },
      grandTotal: grandTotal
    };

    const filename = timeframe === 'custom' 
      ? `FCF_Master_Report_${startDate}_to_${endDate}` 
      : `FCF_Master_Report_${timeframe}_${startDate}`;
    exportToPPTX(analytics, filename, language);
  };

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
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );

  const ChartCard = ({ title, icon, children, style }) => (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        {icon}
        <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>{title}</h4>
      </div>
      {children}
    </div>
  );

  // Admin Transaction Counters Logic

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflowY: 'auto', [language === 'ar' ? 'paddingLeft' : 'paddingRight']: '0.5rem' }}>

      {/* Sticky Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-main)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0, fontSize: '1.25rem' }}>
          <TrendingUp size={22} color="var(--color-primary)" /> {t('analytics')}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', padding: '0.4rem', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap' }}>
            {['daily', 'weekly', 'monthly'].map(tf => (
              <button key={tf} className={`btn ${timeframe === tf ? 'btn-primary' : 'btn-outline'}`} style={{ border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => handleTimeframeChange(tf)}>
                {tf === 'daily' ? (language === 'ar' ? 'يومي' : 'Daily') : tf === 'weekly' ? (language === 'ar' ? 'أسبوعي' : 'Weekly') : (language === 'ar' ? 'شهري' : 'Monthly')}
              </button>
            ))}
            {timeframe === 'custom' && (
              <button className="btn btn-primary" style={{ border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                {t('custom')}
              </button>
            )}
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '0.75rem',
            [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '0.75rem', 
            [language === 'ar' ? 'borderRight' : 'borderLeft']: '1px solid var(--border-color)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{language === 'ar' ? 'المنفذ' : 'Outlet'}</span>
              <select 
                value={selectedOutlet} 
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="date-input-premium"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.8rem', 
                  padding: '0.3rem 0.5rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="All">{language === 'ar' ? 'جميع المنافذ' : 'All Outlets'}</option>
                <option value="eltalg">{t('eltalg')}</option>
                <option value="tegara">{t('tegara')}</option>
                <option value="mostashfa">{t('mostashfa')}</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('from')}</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setTimeframe('custom');
                }}
                className="date-input-premium"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.8rem', 
                  padding: '0.3rem 0.5rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('to')}</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setTimeframe('custom');
                }}
                className="date-input-premium"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.8rem', 
                  padding: '0.3rem 0.5rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            {(selectedOutlet !== 'All' || startDate !== formatDate(new Date()) || endDate !== formatDate(new Date())) && (
              <button 
                onClick={() => {
                  const today = formatDate(new Date());
                  updateFilters('analytics', {
                    outlet: 'All',
                    dateStart: today,
                    dateEnd: today
                  });
                  setTimeframe('daily');
                }}
                className="btn btn-outline" 
                style={{ padding: '0.4rem', color: 'var(--color-danger)' }}
                title={language === 'ar' ? 'إعادة ضبط' : 'Reset'}
              >
                <RotateCcw size={16} />
              </button>
            )}
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
                { group: 'Jumia', metric: 'Cash Collected', value: `${jumiaCash} EGP` },
                { group: 'Jumia', metric: `Picked Up (${t('eltalg')})`, value: jumiaPickedUpByOutlet.eltalg },
                { group: 'Jumia', metric: `In Stock (${t('eltalg')})`, value: jumiaInventoryByOutlet.eltalg },
                { group: 'Jumia', metric: `Picked Up (${t('tegara')})`, value: jumiaPickedUpByOutlet.tegara },
                { group: 'Jumia', metric: `In Stock (${t('tegara')})`, value: jumiaInventoryByOutlet.tegara },
                { group: 'Jumia', metric: `Picked Up (${t('mostashfa')})`, value: jumiaPickedUpByOutlet.mostashfa },
                { group: 'Jumia', metric: `In Stock (${t('mostashfa')})`, value: jumiaInventoryByOutlet.mostashfa },
                { group: 'Jumia', metric: t('pickedFromJumia'), value: jumiaReceived.length },
                { group: 'Jumia', metric: t('pickedUpByCustomer'), value: jumiaPickedUp.length },
                { group: 'Jumia', metric: t('returnedStatus'), value: jumiaReturned.length },
                { group: 'Jumia', metric: language === 'ar' ? 'ملغي' : 'Cancelled', value: jumiaCancelled.length },
                { group: 'Jumia', metric: 'Penalties Pool', value: `${activePenalties} EGP` },
                { group: 'Bosta', metric: 'Cash Collected', value: `${bostaCash} EGP` },
                { group: 'Bosta', metric: 'Picked Up From Bosta', value: bostaReceived.length },
                { group: 'Bosta', metric: 'Picked Up By Customer', value: bostaPickedUp.length },
                { group: 'Bosta', metric: 'Returned', value: bostaReturned.length },
                { group: 'Bosta', metric: 'Cancelled', value: bostaCancelled.length },
                { group: 'Basata', metric: `POS Volume (${t('eltalg')})`, value: `${basataByOutlet.eltalg} EGP` },
                { group: 'Basata', metric: `Transactions (${t('eltalg')})`, value: basataCountByOutlet.eltalg },
                { group: 'Basata', metric: `POS Volume (${t('tegara')})`, value: `${basataByOutlet.tegara} EGP` },
                { group: 'Basata', metric: `Transactions (${t('tegara')})`, value: basataCountByOutlet.tegara },
                { group: 'Basata', metric: `POS Volume (${t('mostashfa')})`, value: `${basataByOutlet.mostashfa} EGP` },
                { group: 'Basata', metric: `Transactions (${t('mostashfa')})`, value: basataCountByOutlet.mostashfa },
                { group: 'Basata', metric: 'Total POS Volume', value: `${basataVolume} EGP` },
                { group: 'Basata', metric: 'Total Transactions', value: activeBasata.length },
                { group: 'Calls Log', metric: 'Total Calls Created', value: callsInPeriod.length },
                { group: 'Calls Log', metric: 'Calls Resolved', value: callsResolved.length },
                { group: 'Calls Log', metric: 'Calls Closed', value: callsClosed.length },
                { group: 'Calls Log', metric: 'Coverage Rate', value: `${coveragePct}%` },
              ]}
              headers={exportHeaders}
              filename={`Analytics_${timeframe === 'custom' ? `${startDate}_to_${endDate}` : timeframe}`}
              title={`${t('analytics')} (${timeframe === 'custom' ? `${startDate} - ${endDate}` : t(timeframe)})`}
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
            <div style={{ fontSize: 'clamp(2.5rem, 10vw, 3.5rem)', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span style={{ fontSize: '0.4em', color: 'var(--text-muted)', [language === 'ar' ? 'marginRight' : 'marginLeft']: '0.5rem' }}>EGP</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', flex: '1 1 auto' }}>
            {[
              { label: t('jumia'), value: jumiaProfit, color: CHART_COLORS.jumia },
              { label: t('bosta'), value: bostaProfit, color: CHART_COLORS.bosta },
              { label: t('basata'), value: basataVolume, color: CHART_COLORS.basata },
              { label: t('penalties'), value: activePenalties, color: CHART_COLORS.warning },
            ].map(s => (
              <div key={s.label} style={{ flex: '1 1 auto', minWidth: '80px', textAlign: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, margin: '0 auto 0.4rem' }} />
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color }}>{s.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <MetricCard title={`${t('jumia')} ${language === 'ar' ? 'الأرباح' : 'Profit'}`} value={`${jumiaProfit.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.jumia} sub={language === 'ar' ? `${jumiaPickedUp.length} طلب استلام عميل` : `${jumiaPickedUp.length} customer pick ups`} />
        <MetricCard title={`${t('bosta')} ${language === 'ar' ? 'الأرباح' : 'Profit'}`} value={`${bostaProfit.toLocaleString()} EGP`} icon={<DollarSign size={14} />} color={CHART_COLORS.bosta} sub={language === 'ar' ? `${bostaPickedUp.length} طلب مستلم` : `${bostaPickedUp.length} orders picked up`} />
        <MetricCard title={`${t('basata')} POS`} value={`${basataVolume.toLocaleString()} EGP`} icon={<Zap size={14} />} color={CHART_COLORS.basata} sub={language === 'ar' ? `${activeBasata.length} عملية` : `${activeBasata.length} transactions`} />
        <MetricCard title={t('parkedPenalties')} value={`${activePenalties} EGP`} icon={<AlertOctagon size={14} />} color={CHART_COLORS.warning} sub={language === 'ar' ? `${jumiaInventory.length} طلب مخزن` : `${jumiaInventory.length} parked orders`} />
        <MetricCard title={language === 'ar' ? 'حالة SLA حرجة' : 'SLA Critical'} value={jumiaSlaCritical} icon={<ShieldAlert size={14} />} color={CHART_COLORS.danger} sub={language === 'ar' ? 'جوميا 5+ أيام تأخير' : 'Jumia 5+ days overdue'} />
        <MetricCard title={t('customers')} value={customers.length} icon={<Users size={14} />} color="var(--color-primary)" sub={language === 'ar' ? 'مسجلين في المحطة' : 'Registered at station'} />
      </div>

      {/* Row 2: Revenue Streams Pie + Orders Comparison Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'تحليل مصادر الإيرادات' : 'Revenue Streams Breakdown'} icon={<Activity size={16} color="var(--color-primary)" />}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={revenueStreamData || []}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {(revenueStreamData || []).map((entry, i) => (
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

        <ChartCard title={language === 'ar' ? 'أرباح جوميا حسب المنفذ' : 'Jumia Profit by Outlet'} icon={<BarChart2 size={16} color={CHART_COLORS.jumia} />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={jumiaProfitByOutletData || []} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => `${v.toLocaleString()} EGP`} />
              <Bar dataKey="amount" name={language === 'ar' ? 'الأرباح' : 'Profit'} fill={CHART_COLORS.jumia} radius={[6, 6, 0, 0]}>
                {(jumiaProfitByOutletData || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={language === 'ar' ? 'طرق دفع جوميا' : 'Jumia Payment Methods'} icon={<DollarSign size={16} color={CHART_COLORS.jumia} />}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={jumiaPaymentData || []}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {(jumiaPaymentData || []).map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip language={language} />} formatter={(v) => `${v.toLocaleString()} EGP`} />
              <Legend formatter={(val) => <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>{val}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Orders Status Pie + SLA Health */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'توزيع حالة الطلبات الكاملة' : 'Full Orders Status Distribution'} icon={<PackageCheck size={16} color={CHART_COLORS.success} />}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ordersStatusData || []} layout="vertical">
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
              <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="value" radius={language === 'ar' ? [6, 0, 0, 6] : [0, 6, 6, 0]}>
                {(ordersStatusData || []).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={language === 'ar' ? 'صحة SLA لـ جوميا' : 'Jumia SLA Health'} icon={<Clock size={16} color={CHART_COLORS.warning} />}>
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
              {language === 'ar' ? `إجمالي ${jumiaInventory.length} في مخزون جوميا` : `${jumiaInventory.length} total in Jumia inventory`}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Basata Category Bar + Top Providers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '1rem' }}>
        <ChartCard title={language === 'ar' ? 'إيرادات بساطة حسب المنفذ' : 'Basata Revenue by Outlet'} icon={<Zap size={16} color={CHART_COLORS.basata} />}>
          {basataByOutletData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={basataByOutletData}>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis orientation={language === 'ar' ? 'right' : 'left'} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip language={language} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => `${v.toLocaleString()} EGP`} />
                <Bar dataKey="amount" name={t('amount')} radius={[6, 6, 0, 0]}>
                  {basataByOutletData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
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
                <th>{t('pickedFromJumia')}</th>
                <th>{language === 'ar' ? 'إجمالي مبلغ المعاملات' : 'Transactions Amount'}</th>
                <th>{language === 'ar' ? 'الأرباح' : 'Profit'}</th>
                <th>{t('pickedUpByCustomer')}</th>
                <th>{t('returnedStatus')}</th>
                <th>{language === 'ar' ? 'ملغي' : 'Cancelled'}</th>
                <th>{language === 'ar' ? 'صافي المركز' : 'Net Position'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span style={{ color: CHART_COLORS.jumia, fontWeight: 700 }}>{t('jumia')}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{jumiaReceived.length}</td>
                <td style={{ color: 'var(--text-muted)' }}>{jumiaCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{jumiaProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{jumiaPickedUp.length}</td>
                <td style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--color-danger)' }}>{jumiaReturned.length}</span></td>
                <td style={{ color: 'var(--color-warning)' }}>{jumiaCancelled.length}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  {jumiaProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.bosta, fontWeight: 700 }}>{t('bosta')}</span></td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bostaReceived.length}</td>
                <td style={{ color: 'var(--text-muted)' }}>{bostaCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{bostaProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{bostaPickedUp.length}</td>
                <td style={{ color: 'var(--text-primary)' }}><span style={{ color: 'var(--color-danger)' }}>{bostaReturned.length}</span></td>
                <td style={{ color: 'var(--color-warning)' }}>{bostaCancelled.length}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                  {bostaProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
                </td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.basata, fontWeight: 700 }}>{t('basata')} POS</span></td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>{basataVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{basataVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{activeBasata.length} {language === 'ar' ? 'عملية' : 'trx'}</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{basataVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
              </tr>
              <tr>
                <td><span style={{ color: CHART_COLORS.warning, fontWeight: 700 }}>{t('penalties')}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activePenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)' }}>{jumiaInventory.length} {language === 'ar' ? 'طلب مخزن' : 'parked'}</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--text-muted)' }}>—</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{activePenalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--border-color)', background: 'var(--bg-overlay)' }}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{language === 'ar' ? 'الإجمالي' : 'TOTAL'}</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{jumiaReceived.length + bostaReceived.length}</td>
                <td style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{(jumiaCash + bostaCash + basataVolume).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP</td>
                <td style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{jumiaPickedUp.length + bostaPickedUp.length}</td>
                <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{jumiaReturned.length + bostaReturned.length}</td>
                <td style={{ color: 'var(--color-warning)', fontWeight: 700 }}>{jumiaCancelled.length + bostaCancelled.length}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: 800 }}>
                  {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
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
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{dailyCount.toLocaleString()}</div>
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
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{weeklyCount.toLocaleString()}</div>
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
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{monthlyCount.toLocaleString()}</div>
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
