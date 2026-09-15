import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Zap, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft, 
  X, RefreshCw, Layers, ShieldCheck, ChevronDown, ChevronUp, Plus, Clock
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function CreditStatusModal({ isOpen, onClose, onNavigateToApprovals }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isRtl = language === 'ar';
  const isAdmin = user?.username?.toLowerCase() === 'admin';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  // Adding Credit sub-flow
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('5000');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('fcf_token');
      if (!token) return;

      const res = await fetch('/api/recharge?status=true', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setData(json.status);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to fetch credit counter status');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching credit status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setIsAddingMode(false);
      setActionSuccess('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleContinue = () => {
    sessionStorage.setItem('fcf_credit_modal_session_dismissed', 'true');
    sessionStorage.removeItem('fcf_just_logged_in');
    onClose();
  };

  const handleAddCreditSubmit = async (e) => {
    if (e) e.preventDefault();
    const num = Number(rechargeAmount);
    if (!num || num <= 0) return;

    setIsSubmitting(true);
    setError('');
    setActionSuccess('');

    try {
      const token = localStorage.getItem('fcf_token');
      const payload = {
        amount: num,
        requestedBy: user?.username || 'User',
        direct: isAdmin // Admin directly increases the limit; others submit request
      };

      const res = await fetch('/api/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (isAdmin) {
          setActionSuccess(t('creditAddedSuccessfully'));
        } else {
          setActionSuccess(t('rechargeRequestSent'));
        }
        window.dispatchEvent(new Event('recharge-updated'));
        // Refresh counter data
        fetchStatus();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to process credit addition');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const limit = data?.limit || 10000;
  const totalConsumed = data?.totalConsumed || 0;
  const creditRemaining = data?.creditRemaining ?? Math.max(0, limit - totalConsumed);
  const consumedThisMonth = data?.consumedThisMonth || 0;
  const remainingPct = Math.round((creditRemaining / limit) * 100);
  const usedPct = Math.min(100, Math.round((totalConsumed / limit) * 100));

  const isLow = remainingPct <= 25;
  const isCritical = remainingPct <= 10;
  const statusColor = isCritical ? '#ef4444' : isLow ? '#f59e0b' : '#22c55e';
  const statusBg = isCritical ? 'rgba(239, 68, 68, 0.12)' : isLow ? 'rgba(245, 158, 11, 0.12)' : 'rgba(34, 197, 94, 0.12)';
  const statusText = isCritical ? t('systemHealthCritical') : isLow ? t('systemHealthWarning') : t('systemHealthGood');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      backgroundColor: 'rgba(5, 7, 15, 0.78)',
      backdropFilter: 'blur(10px)',
      direction: isRtl ? 'rtl' : 'ltr',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--bg-panel)',
          border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px ${isCritical ? 'rgba(239,68,68,0.2)' : 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.15)'}`,
          borderRadius: '1.5rem',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: '-15%',
          [isRtl ? 'left' : 'right']: '-15%',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${statusColor}22 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${statusColor}33, ${statusColor}11)`,
              border: `1px solid ${statusColor}44`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 15px ${statusColor}22`,
              flexShrink: 0
            }}>
              <Zap size={24} color={statusColor} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {t('creditStatusTitle')}
                </h2>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                  background: statusBg,
                  color: statusColor,
                  border: `1px solid ${statusColor}33`
                }}>
                  {statusText}
                </span>
              </div>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {t('creditStatusSubtitle')}
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title={t('continueWithoutAdjustments')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: '36px',
              height: '36px',
              border: '3px solid var(--border-color)',
              borderTop: '3px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('loading')}</div>
          </div>
        )}

        {/* Content View */}
        {!loading && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
            
            {/* Primary KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              
              {/* Card 1: Credit Remaining */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isCritical ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'}`,
                borderRadius: '16px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {t('creditRemaining')}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: statusColor }}>
                    {remainingPct}%
                  </span>
                </div>
                
                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: statusColor, lineHeight: 1 }}>
                  {creditRemaining.toLocaleString()}
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  marginTop: '0.25rem'
                }}>
                  <div style={{
                    width: `${remainingPct}%`,
                    height: '100%',
                    background: statusColor,
                    borderRadius: '999px',
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.1rem' }}>
                  <span>{t('totalCreditLimit')}: {limit.toLocaleString()}</span>
                  <span>{usedPct}% {isRtl ? 'مستخدم' : 'used'}</span>
                </div>
              </div>

              {/* Card 2: Consumed This Month So Far */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {t('creditConsumedThisMonth')}
                  </span>
                  <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.25rem', borderRadius: '6px' }}>
                    <Clock size={14} />
                  </div>
                </div>

                <div style={{ fontSize: '2.1rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {consumedThisMonth.toLocaleString()}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 'auto' }}>
                  {isRtl ? 'تم تسجيلها خلال الشهر الحالي' : 'Recorded in the current calendar month'}
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {t('totalLifetimeConsumed')}: <strong>{totalConsumed.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Breakdown Toggle (Accordion) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.65rem 0.9rem',
              cursor: 'pointer',
              userSelect: 'none'
            }} onClick={() => setShowBreakdown(!showBreakdown)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  <Layers size={15} color="var(--color-primary)" />
                  {t('breakdownTitle')}
                </div>
                {showBreakdown ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
              </div>

              {showBreakdown && data.breakdown && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.75rem',
                  marginTop: '0.85rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: '#f97316' }}>{t('channelJumia')}</div>
                    <div>{isRtl ? 'هذا الشهر:' : 'This Month:'} <strong>{data.breakdown.monthly.jumia.toLocaleString()}</strong></div>
                    <div>{isRtl ? 'الإجمالي:' : 'Lifetime:'} {data.breakdown.lifetime.jumia.toLocaleString()}</div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: '#6366f1' }}>{t('channelBosta')}</div>
                    <div>{isRtl ? 'هذا الشهر:' : 'This Month:'} <strong>{data.breakdown.monthly.bosta.toLocaleString()}</strong></div>
                    <div>{isRtl ? 'الإجمالي:' : 'Lifetime:'} {data.breakdown.lifetime.bosta.toLocaleString()}</div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: '#22d3ee' }}>{t('channelBasata')}</div>
                    <div>{isRtl ? 'هذا الشهر:' : 'This Month:'} <strong>{data.breakdown.monthly.basata.toLocaleString()}</strong></div>
                    <div>{isRtl ? 'الإجمالي:' : 'Lifetime:'} {data.breakdown.lifetime.basata.toLocaleString()}</div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: '#a855f7' }}>{t('channelCustomers')}</div>
                    <div>{isRtl ? 'هذا الشهر:' : 'This Month:'} <strong>{data.breakdown.monthly.customers.toLocaleString()}</strong></div>
                    <div>{isRtl ? 'الإجمالي:' : 'Lifetime:'} {data.breakdown.lifetime.customers.toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Requests Alert for Admin */}
            {isAdmin && Boolean(data.pendingRequestsCount > 0) && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                fontSize: '0.82rem',
                color: '#fcd34d'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} />
                  <span>{t('pendingApprovalsNotice')} ({data.pendingRequestsCount})</span>
                </div>
                {onNavigateToApprovals && (
                  <button
                    onClick={() => {
                      handleContinue();
                      onNavigateToApprovals();
                    }}
                    style={{
                      background: '#f59e0b',
                      border: 'none',
                      color: '#000',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {t('viewApprovalsTab')}
                  </button>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#fca5a5',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={15} />
                {error}
              </div>
            )}

            {/* Success Message */}
            {actionSuccess && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                color: '#86efac',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <CheckCircle2 size={15} />
                {actionSuccess}
              </div>
            )}

            {/* --- ADD CREDIT EXPANDED SECTION --- */}
            {isAddingMode ? (
              <form onSubmit={handleAddCreditSubmit} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                animation: 'fadeSlideUp 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('rechargeAmountLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingMode(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    {t('backToOverview')}
                  </button>
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['2000', '5000', '10000', '20000'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRechargeAmount(preset)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '8px',
                        border: rechargeAmount === preset ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        background: rechargeAmount === preset ? 'rgba(var(--color-primary-rgb, 99, 102, 241), 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        color: rechargeAmount === preset ? 'var(--color-primary)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      +{Number(preset).toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Amount Input */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                    placeholder={t('enterAmount')}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      fontWeight: 700
                    }}
                  />
                  <span style={{
                    position: 'absolute',
                    [isRtl ? 'left' : 'right']: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)'
                  }}>
                    {t('operations')}
                  </span>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || !Number(rechargeAmount)}
                  className="btn btn-primary"
                  style={{
                    padding: '0.75rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSubmitting ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : isAdmin ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  {isAdmin ? t('adminDirectAdd') : t('submitRechargeRequest')}
                </button>
              </form>
            ) : null}

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              
              {!isAddingMode && (
                <button
                  type="button"
                  onClick={() => setIsAddingMode(true)}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    justifyContent: 'center',
                    gap: '0.6rem',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)'
                  }}
                >
                  <CreditCard size={18} />
                  {t('startAddingCredit')}
                </button>
              )}

              {/* Continue Without Making Adjustments Button */}
              <button
                type="button"
                onClick={handleContinue}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  padding: '0.8rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)'
                }}
              >
                <span>{t('continueWithoutAdjustments')}</span>
                {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
              </button>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
