import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function AdminRechargeApproval() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === 'ar';
  const isAdmin = user?.username?.toLowerCase() === 'admin';

  const fetchRequests = async () => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('fcf_token');
      if (!token) return;
      const res = await fetch('/api/recharge', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch recharge requests', err);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchRequests();
    const handleUpdate = () => {
      fetchRequests();
    };
    window.addEventListener('recharge-updated', handleUpdate);
    // Poll every 30 seconds for pending requests
    const interval = setInterval(fetchRequests, 30000);
    return () => {
      window.removeEventListener('recharge-updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('fcf_token');
      const res = await fetch('/api/recharge/approve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        // Remove from list
        setRequests(prev => prev.filter(req => req.id !== id));
        window.dispatchEvent(new Event('recharge-updated'));
      } else {
        alert('Failed to approve request');
      }
    } catch (err) {
      console.error(err);
      alert('Error approving request');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin || requests.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', width: '100%' }}>
      {requests.map(req => (
        <div key={req.id} style={{
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fcd34d',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldAlert size={20} />
            <div>
              <strong>{isRtl ? 'طلب تفعيل خدمة من:' : 'Activation Request from:'} {req.requestedBy}</strong>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                {isRtl ? 'المبلغ:' : 'Amount:'} {req.amount}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleApprove(req.id)}
            disabled={loading}
            style={{
              background: '#22c55e',
              border: 'none',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontWeight: 'bold',
              opacity: loading ? 0.7 : 1
            }}
          >
            <Check size={16} />
            {isRtl ? 'موافقة' : 'Approve'}
          </button>
        </div>
      ))}
    </div>
  );
}
