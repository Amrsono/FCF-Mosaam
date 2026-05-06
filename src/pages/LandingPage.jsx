import React from 'react';
import { Package, Zap, BarChart3, Shield, Phone, ArrowRight, Truck, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onSelectService }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const services = [
    {
      id: 'jumia',
      title: t('jumia'),
      desc: t('jumiaDesc'),
      icon: <Package size={32} />,
      color: '#f97316', // Orange
      gradient: 'linear-gradient(135deg, #f97316, #ea580c)',
      tabs: ['orders', 'customers', 'sla', 'penalties', 'returned']
    },
    {
      id: 'bosta',
      title: t('bosta'),
      desc: t('bostaDesc'),
      icon: <Truck size={32} />,
      color: '#3b82f6', // Blue
      gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      tabs: ['bosta']
    },
    {
      id: 'basata',
      title: t('basata'),
      desc: t('basataDesc'),
      icon: <Zap size={32} />,
      color: '#10b981', // Green
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
      tabs: ['basata']
    }
  ];

  const adminTools = [
    {
      id: 'calls',
      title: t('callsLog'),
      desc: t('callsDesc'),
      icon: <Phone size={24} />,
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      tab: 'calls'
    },
    ...(user?.role === 'admin' ? [
      {
        id: 'analytics',
        title: t('analytics'),
        desc: t('analyticsDesc'),
        icon: <BarChart3 size={24} />,
        gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
        tab: 'analytics'
      },
      {
        id: 'logs',
        title: t('logs'),
        desc: t('logsDesc'),
        icon: <Shield size={24} />,
        gradient: 'linear-gradient(135deg, #64748b, #475569)',
        tab: 'logs'
      }
    ] : [])
  ];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2.5rem', 
      paddingBottom: '2rem',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      {/* Hero Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          background: 'linear-gradient(to right, var(--color-primary), var(--color-accent))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('selectService')}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px' }}>
          {t('selectServiceDesc')}
        </p>
      </div>

      {/* Main Services Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {services.map((s) => (
          <div 
            key={s.id}
            className="glass-panel"
            onClick={() => onSelectService(s.id, s.tabs[0])}
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.25rem', 
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid var(--border-color)',
              position: 'relative',
              overflow: 'hidden',
              group: 'true'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.borderColor = s.color;
              e.currentTarget.style.boxShadow = `0 20px 40px -12px ${s.color}33`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
          >
            {/* Icon Background Circle */}
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              background: s.gradient,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              boxShadow: `0 8px 16px -4px ${s.color}66`
            }}>
              {s.icon}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{s.title}</h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</p>
            </div>

            <div style={{ 
              marginTop: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: s.color, 
              fontWeight: 600,
              fontSize: '0.9rem'
            }}>
              {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
              <ArrowRight size={16} />
            </div>
            
            {/* Subtle background glow */}
            <div style={{ 
              position: 'absolute', 
              top: '-10%', 
              right: '-10%', 
              width: '100px', 
              height: '100px', 
              background: s.color, 
              filter: 'blur(60px)', 
              opacity: 0.1,
              pointerEvents: 'none'
            }} />
          </div>
        ))}
      </div>

      {/* Admin / Ops Tools Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ height: '2px', flex: 1, background: 'var(--border-color)' }}></div>
          <h3 style={{ 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase', 
            letterSpacing: '1px', 
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {t('operationsTools')}
          </h3>
          <div style={{ height: '2px', flex: 1, background: 'var(--border-color)' }}></div>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
          gap: '1rem' 
        }}>
          {adminTools.map((t) => (
            <div 
              key={t.id}
              className="glass-panel"
              onClick={() => onSelectService('admin', t.tab)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                padding: '1rem 1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-panel-hover)';
                e.currentTarget.style.borderColor = 'var(--color-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-panel)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '10px', 
                background: t.gradient,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                {t.icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>{t.title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
