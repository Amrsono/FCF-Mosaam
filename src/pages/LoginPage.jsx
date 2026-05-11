import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, AlertCircle, Shield, Languages, MapPin, ArrowLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const OUTLETS = [
  {
    id: 'eltalg',
    en: 'Eltalg',
    ar: 'التلج',
    icon: '🏪',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.25)',
  },
  {
    id: 'tegara',
    en: 'Tegara',
    ar: 'تجارة',
    icon: '🛒',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.25)',
  },
  {
    id: 'mostashfa',
    en: 'Mostashfa',
    ar: 'مستشفى',
    icon: '🏥',
    color: '#22c55e',
    glow: 'rgba(34,197,94,0.25)',
  },
];

export default function LoginPage() {
  const { login, pendingUser, confirmOutlet, cancelPendingLogin } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hovered, setHovered] = useState(null);

  const isRtl = language === 'ar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    cancelPendingLogin();
    setForm({ username: '', password: '' });
    setError('');
  };

  /* ─── Shared wrapper ──────────────────────────────────────────── */
  const pageWrapper = (children) => (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      {/* Language Toggle */}
      <div style={{ position: 'absolute', top: '2rem', [isRtl ? 'left' : 'right']: '2rem', zIndex: 10 }}>
        <button
          className="btn btn-outline"
          onClick={toggleLanguage}
          style={{ gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
        >
          <Languages size={18} />
          {isRtl ? 'English' : 'العربية'}
        </button>
      </div>

      {/* Background Glow */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {children}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .outlet-card {
          animation: fadeSlideUp 0.35s ease both;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .outlet-card:hover {
          transform: translateY(-4px) scale(1.02);
        }
      `}</style>
    </div>
  );

  /* ─── Branding header (shared) ───────────────────────────────── */
  const brandingHeader = (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #f97316)', padding: '0.75rem', borderRadius: 'var(--radius-md)', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}>
          <Shield size={28} color="white" />
        </div>
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
        {t('fcf')} <span style={{ color: 'var(--color-accent)' }}>{t('mosaam')}</span>
      </div>
      <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
        {isRtl ? 'لوحة إدارة المحطة' : 'Station Management Dashboard'}
      </div>
      <div style={{ margin: '1.25rem auto 0', height: '1px', width: '60%', background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)' }} />
    </div>
  );

  /* ─── OUTLET SELECTION SCREEN ────────────────────────────────── */
  if (pendingUser) {
    return pageWrapper(
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', position: 'relative', zIndex: 1 }}>
        {brandingHeader}

        {/* Greeting */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.4rem' }}>
            <MapPin size={16} />
            {isRtl ? 'أهلاً،' : 'Welcome,'} <strong style={{ color: 'white' }}>{pendingUser.username}</strong>
          </div>
          <h2 style={{ color: 'white', margin: '0', fontSize: '1.15rem', fontWeight: 700 }}>
            {isRtl ? 'اختر الفرع الذي ستعمل فيه اليوم' : 'Choose your outlet for today'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.4rem 0 0' }}>
            {isRtl ? 'ستُقيَّد كل عملياتك على هذا الفرع حتى تسجيل الخروج' : 'All your actions will be scoped to this outlet until logout'}
          </p>
        </div>

        {/* Outlet Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
          {OUTLETS.map((outlet, i) => (
            <button
              key={outlet.id}
              className="outlet-card"
              onClick={() => confirmOutlet(outlet.id)}
              onMouseEnter={() => setHovered(outlet.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                animationDelay: `${i * 0.07}s`,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                background: hovered === outlet.id
                  ? `rgba(255,255,255,0.06)`
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered === outlet.id ? outlet.color : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                boxShadow: hovered === outlet.id ? `0 0 18px ${outlet.glow}` : 'none',
                color: 'white',
                textAlign: isRtl ? 'right' : 'left',
                width: '100%',
                direction: isRtl ? 'rtl' : 'ltr',
              }}
            >
              <span style={{
                fontSize: '1.75rem',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${outlet.glow}`,
                borderRadius: '12px',
                border: `1px solid ${outlet.color}33`,
                flexShrink: 0
              }}>
                {outlet.icon}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '1rem', color: hovered === outlet.id ? outlet.color : 'white' }}>
                  {isRtl ? outlet.ar : outlet.en}
                </span>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {isRtl ? `العمل على فرع ${outlet.ar}` : `Work at ${outlet.en} branch`}
                </span>
              </span>
              <ChevronRight
                size={18}
                style={{
                  color: hovered === outlet.id ? outlet.color : 'var(--text-muted)',
                  transform: isRtl ? 'rotate(180deg)' : 'none',
                  transition: 'color 0.18s ease',
                  flexShrink: 0
                }}
              />
            </button>
          ))}
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.83rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.4rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={14} style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} />
            {isRtl ? 'العودة لتسجيل الدخول' : 'Back to login'}
          </button>
        </div>
      </div>
    );
  }

  /* ─── CREDENTIALS SCREEN (original) ─────────────────────────── */
  return pageWrapper(
    <div className="glass-panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', position: 'relative', zIndex: 1 }}>
      {brandingHeader}

      {/* Sign In Label */}
      <div style={{ marginBottom: '1.5rem', textAlign: isRtl ? 'right' : 'left' }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{isRtl ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account'}</h2>
        <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{isRtl ? 'أدخل بياناتك للوصول إلى لوحة التحكم' : 'Enter your credentials to access the dashboard'}</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          color: '#fca5a5',
          fontSize: '0.88rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Username */}
        <div className="input-group">
          <label className="input-label" style={{ textAlign: isRtl ? 'right' : 'left' }}>{isRtl ? 'اسم المستخدم' : 'Username'}</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              required
              autoFocus
              type="text"
              className="input-field"
              style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem' }}
              placeholder={isRtl ? 'أدخل اسم المستخدم' : 'Enter username'}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
            />
          </div>
        </div>

        {/* Password */}
        <div className="input-group">
          <label className="input-label" style={{ textAlign: isRtl ? 'right' : 'left' }}>{isRtl ? 'كلمة المرور' : 'Password'}</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              required
              type={showPassword ? 'text' : 'password'}
              className="input-field"
              style={{ [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem', [isRtl ? 'paddingLeft' : 'paddingRight']: '3rem' }}
              placeholder={isRtl ? 'أدخل كلمة المرور' : 'Enter password'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', [isRtl ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.85rem',
            fontSize: '1rem',
            fontWeight: 600,
            justifyContent: 'center',
            opacity: isLoading ? 0.7 : 1,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', display: 'inline-block'
              }} />
              {t('loading')}...
            </span>
          ) : (isRtl ? 'تسجيل الدخول' : 'Sign In')}
        </button>
      </form>

      {/* Footer Note */}
      <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
        <Lock size={12} style={{ [isRtl ? 'marginLeft' : 'marginRight']: '0.3rem', verticalAlign: 'middle' }} />
        {isRtl ? 'مؤمن بواسطة JWT Authentication — FCF Mosaam © 2026' : 'Secured by JWT Authentication — FCF Mosaam © 2026'}
      </div>
    </div>
  );
}
