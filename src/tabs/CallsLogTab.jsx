import React, { useState, useMemo } from 'react';
import { useDashboard, getDaysDifference } from '../context/DashboardContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Phone, PhoneCall, CheckCircle2, XCircle, ChevronDown, Clock, Package, AlertCircle, EyeOff, Eye, Download, RefreshCw } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';

// Resolution config: key → { label key, color, icon }
const RESOLUTIONS = [
  { value: 'coming_pickup',   labelKey: 'resComingPickup',   color: 'var(--color-success)' },
  { value: 'will_cancel',     labelKey: 'resWillCancel',     color: 'var(--color-danger)'  },
  { value: 'no_answer',       labelKey: 'resNoAnswer',       color: 'var(--color-warning)' },
  { value: 'declined',        labelKey: 'resDeclined',       color: '#a855f7'               },
  { value: 'no_longer_wants', labelKey: 'resNoLongerWants',  color: '#f97316'               },
];

export default function CallsLogTab() {
  const { orders, bostaOrders, customers, callLogs,
          createOrGetCallLog, takeCallOwnership, resolveCall, closeCallLog, reopenCallLog } = useDashboard();
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const [showClosed, setShowClosed] = useState(false);
  // Per-card local state for the resolution form (orderId → { resolution, notes })
  const [formState, setFormState] = useState({});

  const isRTL = language === 'ar';

  // Build list of urgent (orange SLA = 2–3 days) inventory orders from both sources
  const urgentOrders = useMemo(() => {
    const buildUrgent = (orderSet, source) =>
      orderSet
        .filter(o => o.status === 'Inventory')
        .map(o => {
          const days = getDaysDifference(o.receivedAt);
          const cust = customers.find(c => c.phone === o.customerPhone);
          const slaStatus = days >= 4 ? 'red' : 'orange'; 
          return { ...o, daysParked: days, slaStatus, orderSource: source, customerName: cust?.name || (isRTL ? 'غير معروف' : 'Unknown') };
        })
        .filter(o => o.daysParked >= 2); // Show all delayed and critical orders

    return [
      ...buildUrgent(orders, 'jumia'),
      ...buildUrgent(bostaOrders, 'bosta'),
    ].sort((a, b) => b.daysParked - a.daysParked);
  }, [orders, bostaOrders, customers, isRTL]);

  // Match each urgent order to its callLog entry (if any)
  const enrichedList = useMemo(() => {
    return urgentOrders.map(order => {
      const log = callLogs.find(l => l.orderId === order.id && !l.isClosed);
      const closedLog = callLogs.find(l => l.orderId === order.id && l.isClosed);
      return { ...order, callLog: log || null, hasClosed: !!closedLog };
    });
  }, [urgentOrders, callLogs]);

  // Also surface closed-log entries when showClosed is on
  const closedEntries = useMemo(() => {
    if (!showClosed) return [];
    return callLogs
      .filter(l => l.isClosed)
      .map(l => {
        const srcOrders = l.orderSource === 'bosta' ? bostaOrders : orders;
        const order = srcOrders.find(o => o.id === l.orderId);
        const cust = customers.find(c => c.phone === l.customerPhone);
        return { ...l, orderObj: order, customerName: cust?.name || (isRTL ? 'غير معروف' : 'Unknown') };
      });
  }, [callLogs, showClosed, orders, bostaOrders, customers, isRTL]);

  const getResolutionMeta = (value) => RESOLUTIONS.find(r => r.value === value);

  const handleTakeCall = async (order) => {
    // Create log if not yet created, then take ownership
    let log = callLogs.find(l => l.orderId === order.id && !l.isClosed);
    if (!log) {
      await createOrGetCallLog(order.id, order.orderSource, order.customerPhone, order.outlet);
      // After create, refetch will update callLogs — ownership must be a second step
      // Use a small approach: POST creates + returns the log, TAKE is separate
    }
    // After fetchData the log will exist; find fresh
    const freshLog = callLogs.find(l => l.orderId === order.id && !l.isClosed);
    if (freshLog) {
      await takeCallOwnership(freshLog.id, user?.username || 'Agent');
    } else {
      // If not yet in state (race), create and then take
      const res = await fetch('/api/call-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, orderSource: order.orderSource, customerPhone: order.customerPhone, outlet: order.outlet })
      });
      if (res.ok) {
        const newLog = await res.json();
        await takeCallOwnership(newLog.id, user?.username || 'Agent');
      }
    }
  };

  const handleSubmitResolution = async (logId) => {
    const f = formState[logId] || {};
    if (!f.resolution) return;
    await resolveCall(logId, f.resolution, f.notes || '');
    setFormState(prev => { const n = { ...prev }; delete n[logId]; return n; });
  };

  // Resolution label map for human-readable export values
  const RESOLUTION_LABELS = {
    coming_pickup:   t('resComingPickup'),
    will_cancel:     t('resWillCancel'),
    no_answer:       t('resNoAnswer'),
    declined:        t('resDeclined'),
    no_longer_wants: t('resNoLongerWants'),
  };

  // Build a fully enriched export dataset — every log joined with its order + customer data
  const allLogsForExport = useMemo(() => {
    return callLogs.map(log => {
      const srcOrders = log.orderSource === 'bosta' ? bostaOrders : orders;
      const order = srcOrders.find(o => o.id === log.orderId);
      const cust  = customers.find(c => c.phone === log.customerPhone);
      const daysParked = order ? getDaysDifference(order.receivedAt) : '-';
      return {
        ...log,
        _customerName: cust?.name || '-',
        _outlet:       order?.outlet || '-',
        _description:  order?.description || '-',
        _totalValue:   order?.totalValue ?? '-',
        _daysParked:   daysParked,
        _receivedAt:   order?.receivedAt ? new Date(order.receivedAt).toLocaleString() : '-',
        _resolutionLabel: log.resolution ? (RESOLUTION_LABELS[log.resolution] || log.resolution) : '-',
      };
    });
  }, [callLogs, orders, bostaOrders, customers]);

  // Full export headers — 14 columns
  const exportHeaders = [
    { label: isRTL ? 'رقم الطلب'         : 'Order ID',          accessor: 'orderId' },
    { label: isRTL ? 'المصدر'             : 'Source',            accessor: l => l.orderSource === 'bosta' ? 'Bosta' : 'Jumia' },
    { label: isRTL ? 'اسم العميل'        : 'Customer Name',     accessor: '_customerName' },
    { label: isRTL ? 'هاتف العميل'       : 'Customer Phone',    accessor: 'customerPhone' },
    { label: isRTL ? 'المنفذ'            : 'Outlet',            accessor: '_outlet' },
    { label: isRTL ? 'وصف الطلب'        : 'Description',       accessor: '_description' },
    { label: isRTL ? 'قيمة الطلب'       : 'Order Value (EGP)', accessor: '_totalValue' },
    { label: isRTL ? 'أيام في المخزن'   : 'Days Parked',       accessor: '_daysParked' },
    { label: isRTL ? 'تاريخ الاستلام'   : 'Received At',       accessor: '_receivedAt' },
    { label: isRTL ? 'الوكيل'           : 'Agent',             accessor: l => l.agentName || '-' },
    { label: isRTL ? 'وقت إجراء المكالمة' : 'Call Made At',  accessor: l => l.takenAt ? new Date(l.takenAt).toLocaleString() : '-' },
    { label: isRTL ? 'نتيجة المكالمة'  : 'Resolution',        accessor: '_resolutionLabel' },
    { label: isRTL ? 'ملاحظات'          : 'Notes',             accessor: l => l.notes || '-' },
    { label: isRTL ? 'وقت تسجيل النتيجة' : 'Resolved At',     accessor: l => l.resolvedAt ? new Date(l.resolvedAt).toLocaleString() : '-' },
    { label: isRTL ? 'تاريخ الإنشاء'   : 'Created At',        accessor: l => l.createdAt ? new Date(l.createdAt).toLocaleString() : '-' },
    { label: isRTL ? 'الحالة'           : 'Status',            accessor: l => l.isClosed ? (isRTL ? 'مغلق' : 'Closed') : (isRTL ? 'مفتوح' : 'Open') },
  ];

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(245,158,11,0.15)', padding: '0.75rem', borderRadius: '50%' }}>
            <Phone size={24} color="var(--color-warning)" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              {t('callsLog')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem' }}>
              {isRTL ? 'طلبات تحتاج تواصل عاجل مع العميل (2+ أيام في المخزن)' : 'Orders requiring urgent customer contact (2+ days in inventory)'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Admin-only Excel export */}
          {user?.role === 'admin' && (
            <button
              className="btn btn-outline"
              style={{ color: 'var(--color-success)', borderColor: 'rgba(50,255,100,0.3)', fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
              onClick={() => exportToExcel(allLogsForExport, exportHeaders, 'Calls_Log_Export')}
              title={isRTL ? 'تصدير إلى إكسل (للمديرين فقط)' : 'Export to Excel (Admin only)'}
            >
              <Download size={15} /> {isRTL ? 'إكسل' : 'Excel'}
            </button>
          )}

          {/* Show/hide closed */}
          <button
            className="btn btn-outline"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem', gap: '0.4rem' }}
            onClick={() => setShowClosed(s => !s)}
          >
            {showClosed ? <EyeOff size={15} /> : <Eye size={15} />}
            {showClosed ? t('hideClosed') : t('showClosed')}
          </button>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={`badge badge-${enrichedList.some(o => o.slaStatus === 'red') ? 'danger' : 'warning'}`} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          <AlertCircle size={13} style={{ marginInlineEnd: '0.4rem' }} />
          {t('urgentCallsCount')}: {enrichedList.length}
        </div>
        <div className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          {isRTL ? 'تم الحل' : 'Resolved'}: {callLogs.filter(l => l.resolution && !l.isClosed).length}
        </div>
        <div className="badge badge-neutral" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
          {isRTL ? 'مغلق' : 'Closed'}: {callLogs.filter(l => l.isClosed).length}
        </div>
      </div>

      {/* ── Active urgent call cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, overflowY: 'auto' }}>

        {enrichedList.length === 0 && (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Phone size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
            {t('noActiveUrgentCalls')}
          </div>
        )}

        {enrichedList.map(order => {
          const log = order.callLog;
          const resMeta = log?.resolution ? getResolutionMeta(log.resolution) : null;
          const form = formState[log?.id] || {};

          return (
            <div
              key={order.id}
              className="glass-panel"
              style={{
                borderLeft: isRTL ? 'none' : `4px solid ${order.slaStatus === 'red' ? 'var(--color-danger)' : 'var(--color-warning)'}`,
                borderRight: isRTL ? `4px solid ${order.slaStatus === 'red' ? 'var(--color-danger)' : 'var(--color-warning)'}` : 'none',
                background: log?.resolution
                  ? `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${resMeta?.color}10, transparent)`
                  : `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${order.slaStatus === 'red' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'}, transparent)`,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Top row: order info + badges */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{order.id}</span>
                    {/* Source badge */}
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.55rem',
                      borderRadius: '999px', background: order.orderSource === 'bosta' ? 'rgba(99,102,241,0.2)' : 'rgba(245,158,11,0.15)',
                      color: order.orderSource === 'bosta' ? '#818cf8' : 'var(--color-warning)',
                      border: `1px solid ${order.orderSource === 'bosta' ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}>
                      <Package size={10} style={{ marginInlineEnd: '0.25rem' }} />
                      {order.orderSource === 'bosta' ? t('sourceBosta') : t('sourceJ')}
                    </span>
                    {/* Days parked badge */}
                    <span className={`badge badge-${order.slaStatus === 'red' ? 'danger' : 'warning'}`} style={{ fontSize: '0.7rem' }}>
                      <Clock size={10} style={{ marginInlineEnd: '0.2rem' }} />
                      {order.daysParked} {isRTL ? 'أيام' : 'days'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    👤 {order.customerName} • 📞 {order.customerPhone}
                  </span>
                  {order.outlet && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      🏪 {order.outlet}
                    </span>
                  )}
                </div>

                {/* Resolution badge (if resolved) */}
                {resMeta && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: `${resMeta.color}18`, color: resMeta.color,
                    border: `1px solid ${resMeta.color}40`,
                    borderRadius: 'var(--radius-md)', padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <CheckCircle2 size={14} />
                    {t(resMeta.labelKey)}
                  </div>
                )}
              </div>

              {/* Agent ownership row */}
              {log?.agentName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <PhoneCall size={14} color="var(--color-warning)" />
                  <span style={{ color: 'var(--color-warning)', fontWeight: 600 }}>{log.agentName}</span>
                  <span>{isRTL ? '— أجرى المكالمة' : '— made the call'}</span>
                  {log.takenAt && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      @ {new Date(log.takenAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              ) : null}

              {/* Notes display (after resolution) */}
              {log?.notes && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  📝 {log.notes}
                </div>
              )}

              {/* Action bar */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>

                {/* Step 1: Take Call / Follow Up button */}
                {(!log?.agentName || (log?.agentName !== user?.username && !log?.resolution)) && (
                  <button
                    className="btn btn-outline"
                    style={{ color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,0.4)', fontWeight: 600, gap: '0.5rem' }}
                    onClick={() => handleTakeCall(order)}
                  >
                    <Phone size={15} />
                    {log?.agentName ? (isRTL ? 'متابعة' : 'Follow Up') : t('takeCall')}
                  </button>
                )}

                {/* Step 2: Resolution form (only after agent took call + not yet resolved) */}
                {log?.agentName && !log?.resolution && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: 1, alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {t('callResolutionLabel')} *
                      </label>
                      <select
                        className="input-field"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
                        value={form.resolution || ''}
                        onChange={e => setFormState(prev => ({ ...prev, [log.id]: { ...prev[log.id], resolution: e.target.value } }))}
                      >
                        <option value="">{isRTL ? '— اختر النتيجة —' : '— Select outcome —'}</option>
                        {RESOLUTIONS.map(r => (
                          <option key={r.value} value={r.value}>{t(r.labelKey)}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {t('callNotes')}
                      </label>
                      <input
                        className="input-field"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
                        placeholder={isRTL ? 'ملاحظات إضافية...' : 'Additional notes...'}
                        value={form.notes || ''}
                        onChange={e => setFormState(prev => ({ ...prev, [log.id]: { ...prev[log.id], notes: e.target.value } }))}
                      />
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', alignSelf: 'flex-end' }}
                      disabled={!form.resolution}
                      onClick={() => handleSubmitResolution(log.id)}
                    >
                      <CheckCircle2 size={15} />
                      {t('submitResolution')}
                    </button>
                  </div>
                )}

                {/* Re-open button (only if resolved) */}
                {log?.resolution && (
                  <button
                    className="btn btn-outline"
                    style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)', fontSize: '0.82rem', padding: '0.4rem 0.8rem', gap: '0.4rem' }}
                    title={isRTL ? 'إعادة فتح المكالمة' : 'Re-open this call'}
                    onClick={() => reopenCallLog(log.id)}
                  >
                    <RefreshCw size={14} />
                    {isRTL ? 'إعادة فتح' : 'Re-open'}
                  </button>
                )}

                {/* Close button — always available if there's a log */}
                {log && (
                  <button
                    className="btn btn-outline"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)', fontSize: '0.82rem', padding: '0.4rem 0.8rem', marginInlineStart: 'auto', gap: '0.4rem' }}
                    title={isRTL ? 'إغلاق هذه البطاقة' : 'Close this card'}
                    onClick={() => closeCallLog(log.id)}
                  >
                    <XCircle size={14} />
                    {t('closeCall')}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Closed entries (when showClosed) ── */}
        {showClosed && closedEntries.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
              <EyeOff size={14} />
              {isRTL ? 'المكالمات المغلقة' : 'Closed Calls'}
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            </div>
            {closedEntries.map(log => {
              const resMeta = log.resolution ? getResolutionMeta(log.resolution) : null;
              return (
                <div
                  key={log.id}
                  className="glass-panel"
                  style={{ opacity: 0.55, padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{log.orderId}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {log.agentName || '-'} • {log.createdAt ? new Date(log.createdAt).toLocaleString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </div>
                  {resMeta && (
                    <span style={{ fontSize: '0.78rem', color: resMeta.color, fontWeight: 600 }}>
                      {t(resMeta.labelKey)}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
