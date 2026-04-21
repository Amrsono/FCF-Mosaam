import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Eye, EyeOff, AlertCircle, Shield, Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      direction: language === 'ar' ? 'rtl' : 'ltr'
    }}>

      {/* Language Toggle in Corner */}
      <div style={{ position: 'absolute', top: '2rem', [language === 'ar' ? 'left' : 'right']: '2rem', zIndex: 10 }}>
        <button 
          className="btn btn-outline" 
          onClick={toggleLanguage}
          style={{ gap: '0.5rem', background: 'rgba(255,255,255,0.05)' }}
        >
          <Languages size={18} />
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>

      {/* Background Glow Effects */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Login Card */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        position: 'relative',
        zIndex: 1
      }}>

        {/* Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary), #f97316)', padding: '0.75rem', borderRadius: 'var(--radius-md)', boxShadow: '0 0 20px rgba(249,115,22,0.4)' }}>
              <Shield size={28} color="white" />
            </div>
          </div>

          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px' }}>
            {t('fcf')} <span style={{ color: 'var(--color-accent)' }}>{t('mosaam')}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
            {language === 'ar' ? 'لوحة إدارة المحطة' : 'Station Management Dashboard'}
          </div>

          <div style={{
            margin: '1.25rem auto 0',
            height: '1px',
            width: '60%',
            background: 'linear-gradient(90deg, transparent, var(--border-color), transparent)'
          }} />
        </div>

        {/* Sign In Label */}
        <div style={{ marginBottom: '1.5rem', textAlign: language === 'ar' ? 'right' : 'left' }}>
          <h2 style={{ color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{language === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Sign in to your account'}</h2>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.85rem' }}>{language === 'ar' ? 'أدخل بياناتك للوصول إلى لوحة التحكم' : 'Enter your credentials to access the dashboard'}</p>
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
            <label className="input-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                required
                autoFocus
                type="text"
                className="input-field"
                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.5rem' }}
                placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter username'}
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
              />
            </div>
          </div>

          {/* Password */}
          <div className="input-group">
            <label className="input-label" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>{language === 'ar' ? 'كلمة المرور' : 'Password'}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', [language === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ [language === 'ar' ? 'paddingRight' : 'paddingLeft']: '2.5rem', [language === 'ar' ? 'paddingLeft' : 'paddingRight']: '3rem' }}
                placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', [language === 'ar' ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}
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
            ) : (language === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
          </button>
        </form>

        {/* Footer Note */}
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <Lock size={12} style={{ [language === 'ar' ? 'marginLeft' : 'marginRight']: '0.3rem', verticalAlign: 'middle' }} />
          {language === 'ar' ? 'مؤمن بواسطة JWT Authentication — FCF Mosaam © 2024' : 'Secured by JWT Authentication — FCF Mosaam © 2024'}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
