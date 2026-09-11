import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, CheckCircle2, XCircle, Clock, Search, RefreshCw, 
  Download, ShieldAlert, Check, X, Filter, User, ArrowUpRight 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function RechargeApprovalsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [searchQuery, setSearchQuery] = useState('');
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === 'ar';
  const isAdmin = user?.username?.toLowerCase() === 'admin';

  const fetchRequests = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('fcf_token');
      if (!token) return;
      const res = await fetch('/api/recharge?all=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch recharge history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchRequests();

    const handleUpdate = () => {
      fetchRequests();
    };

    window.addEventListener('recharge-updated', handleUpdate);
    const interval = setInterval(fetchRequests, 20000); // 20s poll

    return () => {
      window.removeEventListener('recharge-updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(
      isRtl 
        ? (action === 'approve' ? 'هل أنت متأكد من الموافقة على هذا الطلب وزيادة الحد؟' : 'هل أنت متأكد من رفض هذا الطلب؟')
        : (action === 'approve' ? 'Are you sure you want to approve this request and increase the limit?' : 'Are you sure you want to reject this request?')
    )) {
      return;
    }

    setActionLoadingId(id);
    try {
      const token = localStorage.getItem('fcf_token');
      const endpoint = action === 'approve' ? '/api/recharge/approve' : '/api/recharge/reject';
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        // Update local state and trigger global sync
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
        window.dispatchEvent(new Event('recharge-updated'));
      } else {
        alert(isRtl ? 'فشل تنفيذ الإجراء' : 'Failed to perform action');
      }
    } catch (err) {
      console.error(err);
      alert(isRtl ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchStatus = filterStatus === 'all' || req.status === filterStatus;
      const matchQuery = 
        !searchQuery.trim() || 
        req.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(req.amount).includes(searchQuery);
      return matchStatus && matchQuery;
    });
  }, [requests, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'pending');
    const approved = requests.filter(r => r.status === 'approved');
    const rejected = requests.filter(r => r.status === 'rejected');
    const approvedAmount = approved.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const pendingAmount = pending.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      rejectedCount: rejected.length,
      approvedAmount,
      pendingAmount
    };
  }, [requests]);

  const exportCSV = () => {
    const headers = ['ID', 'Requested By', 'Amount', 'Status', 'Date', 'Updated At'];
    const rows = filteredRequests.map(r => [
      r.id,
      r.requestedBy,
      r.amount,
      r.status,
      new Date(r.createdAt).toLocaleString(),
      new Date(r.updatedAt).toLocaleString()
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `recharge_requests_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CreditCard className="text-primary" size={28} />
            {isRtl ? 'إدارة وسجل طلبات شحن الرصيد' : 'Recharge Approvals & History'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isRtl ? 'مراجعة واعتماد طلبات شحن وتفعيل حدود العمليات لموظفي ومستخدمي النظام' : 'Review and approve transaction limit recharge requests submitted by users'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-outline"
            onClick={fetchRequests}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {isRtl ? 'تحديث' : 'Refresh'}
          </button>
          <button 
            className="btn btn-outline"
            onClick={exportCSV}
            disabled={filteredRequests.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
          >
            <Download size={16} />
            {isRtl ? 'تصدير CSV' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '1rem' 
      }}>
        {/* Pending Card */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          border: stats.pendingCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-color)',
          background: stats.pendingCount > 0 ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-panel)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isRtl ? 'طلبات قيد الانتظار' : 'Pending Requests'}
            </span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '0.4rem', borderRadius: '8px' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.pendingCount > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
            {stats.pendingCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRtl ? `إجمالي المطلوب: ${stats.pendingAmount.toLocaleString()} عملية` : `Total pending: ${stats.pendingAmount.toLocaleString()} ops`}
          </div>
        </div>

        {/* Approved Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isRtl ? 'الطلبات المعتمدة' : 'Approved Requests'}
            </span>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '0.4rem', borderRadius: '8px' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#22c55e' }}>
            {stats.approvedCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRtl ? `المشحون المعتمد: +${stats.approvedAmount.toLocaleString()}` : `Total approved: +${stats.approvedAmount.toLocaleString()}`}
          </div>
        </div>

        {/* Rejected Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isRtl ? 'الطلبات المرفوضة' : 'Rejected Requests'}
            </span>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '0.4rem', borderRadius: '8px' }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {stats.rejectedCount}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRtl ? 'طلبات تم رفضها' : 'Declined submissions'}
          </div>
        </div>

        {/* Total History Count */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {isRtl ? 'إجمالي السجلات' : 'Total History Logs'}
            </span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '0.4rem', borderRadius: '8px' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {requests.length}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {isRtl ? 'كافة المعاملات المسجلة' : 'All lifetime records'}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          {[
            { id: 'all', label: isRtl ? 'الكل' : 'All', count: requests.length },
            { id: 'pending', label: isRtl ? 'قيد الانتظار' : 'Pending', count: stats.pendingCount },
            { id: 'approved', label: isRtl ? 'المعتمدة' : 'Approved', count: stats.approvedCount },
            { id: 'rejected', label: isRtl ? 'المرفوضة' : 'Rejected', count: stats.rejectedCount }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: 'none',
                background: filterStatus === tab.id ? 'var(--color-primary)' : 'transparent',
                color: filterStatus === tab.id ? 'white' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{ 
                fontSize: '0.75rem', 
                background: filterStatus === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.1)', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '999px' 
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [isRtl ? 'right' : 'left']: '0.85rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={isRtl ? 'بحث باسم المستخدم أو المبلغ...' : 'Search by username or amount...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: isRtl ? '0.55rem 2.25rem 0.55rem 0.85rem' : '0.55rem 0.85rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-main)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '1rem 1.25rem' }}>{isRtl ? 'المستخدم' : 'Requested By'}</th>
                <th style={{ padding: '1rem 1.25rem' }}>{isRtl ? 'الكمية / المبلغ' : 'Amount'}</th>
                <th style={{ padding: '1rem 1.25rem' }}>{isRtl ? 'الحالة' : 'Status'}</th>
                <th style={{ padding: '1rem 1.25rem' }}>{isRtl ? 'تاريخ الطلب' : 'Request Date'}</th>
                <th style={{ padding: '1rem 1.25rem' }}>{isRtl ? 'آخر تحديث' : 'Last Updated'}</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
                    <div>{isRtl ? 'جاري تحميل السجلات...' : 'Loading recharge logs...'}</div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ShieldAlert size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{isRtl ? 'لا توجد طلبات مطابقة' : 'No matching recharge requests found'}</div>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{isRtl ? 'سيتم إدراج أي طلب جديد تلقائياً عند تقديمه' : 'New requests will automatically show up here'}</div>
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';

                  return (
                    <tr 
                      key={req.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isPending ? 'rgba(245, 158, 11, 0.04)' : undefined,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Requester */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '10px', 
                            background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.12)', 
                            color: isPending ? '#f59e0b' : '#3b82f6',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            fontWeight: 700
                          }}>
                            <User size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                              {req.requestedBy}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              #{req.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                          +{Number(req.amount).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {isRtl ? 'عملية / معاملة' : 'Operations/Limit'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '999px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: isPending 
                            ? 'rgba(245, 158, 11, 0.15)' 
                            : isApproved 
                            ? 'rgba(34, 197, 94, 0.15)' 
                            : 'rgba(239, 68, 68, 0.15)',
                          color: isPending 
                            ? '#f59e0b' 
                            : isApproved 
                            ? '#22c55e' 
                            : '#ef4444'
                        }}>
                          {isPending && <Clock size={12} />}
                          {isApproved && <CheckCircle2 size={12} />}
                          {isRejected && <XCircle size={12} />}
                          {isPending 
                            ? (isRtl ? 'قيد الانتظار' : 'Pending') 
                            : isApproved 
                            ? (isRtl ? 'معتمد' : 'Approved') 
                            : (isRtl ? 'مرفوض' : 'Rejected')}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div>{new Date(req.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Updated Date */}
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div>{new Date(req.updatedAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleAction(req.id, 'approve')}
                              disabled={actionLoadingId === req.id}
                              style={{
                                background: '#22c55e',
                                border: 'none',
                                color: 'white',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                opacity: actionLoadingId === req.id ? 0.6 : 1
                              }}
                              title={isRtl ? 'موافقة على الطلب' : 'Approve request'}
                            >
                              <Check size={14} />
                              {isRtl ? 'موافقة' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleAction(req.id, 'reject')}
                              disabled={actionLoadingId === req.id}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                padding: '0.45rem 0.75rem',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontWeight: 600,
                                fontSize: '0.8rem',
                                opacity: actionLoadingId === req.id ? 0.6 : 1
                              }}
                              title={isRtl ? 'رفض الطلب' : 'Reject request'}
                            >
                              <X size={14} />
                              {isRtl ? 'رفض' : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {isApproved ? (isRtl ? 'تمت الزيادة' : 'Completed') : (isRtl ? 'مغلق' : 'Closed')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
