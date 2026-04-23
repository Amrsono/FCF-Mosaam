import React, { useState } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Package, Users, Clock, AlertTriangle, BarChart3, LayoutDashboard, Zap, LogOut, Shield, Menu, X, Phone } from 'lucide-react';
import OrdersTab from './tabs/OrdersTab';
import CustomersTab from './tabs/CustomersTab';
import SLATab from './tabs/SLATab';
import ParkedPenaltiesTab from './tabs/ParkedPenaltiesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ReturnedTab from './tabs/ReturnedTab';
import BasataTab from './tabs/BasataTab';
import BostaTab from './tabs/BostaTab';
import LogsTab from './tabs/LogsTab';
import CallsLogTab from './tabs/CallsLogTab';
import LoginPage from './pages/LoginPage';

import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Languages, Moon, Sun, Monitor } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('orders');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'var(--text-muted)' }}>{t('loading')}</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const tabs = [
    { id: 'orders',    label: t('inventory'), icon: <Package size={20} /> },
    { id: 'customers', label: t('customers'), icon: <Users size={20} /> },
    { id: 'sla',       label: t('sla'),       icon: <Clock size={20} /> },
    { id: 'penalties', label: t('penalties'), icon: <AlertTriangle size={20} /> },
    { id: 'basata',    label: t('basata'),    icon: <Zap size={20} /> },
    { id: 'bosta',     label: t('bosta'),     icon: <Package size={20} /> },
    { id: 'returned',  label: t('returned'),  icon: <Package size={20} /> },
    { id: 'calls',     label: t('callsLog'),  icon: <Phone size={20} /> },
    ...(user?.role === 'admin' ? [
      { id: 'analytics', label: t('analytics'), icon: <BarChart3 size={20} /> },
      { id: 'logs', label: t('logs'), icon: <Shield size={20} /> }
    ] : []),
  ];

  return (
    <div className="app-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Mobile Overlay */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setIsMobileMenuOpen(false)}>
          <X size={24} />
        </button>
        <div style={{ padding: '1rem 0', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {t('fcf')} <span style={{ color: 'var(--color-accent)' }}>{t('mosaam')}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <LayoutDashboard size={24} color="white" />
            </div>
            <h1 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>{t('jumiaStation')}</h1>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              style={{ background: activeTab === tab.id ? undefined : 'transparent', border: activeTab === tab.id ? undefined : 'none', textAlign: language === 'ar' ? 'right' : 'left', width: '100%' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Theme + Language Switcher + User Info + Logout */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          <div style={{ display: 'flex', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
            <button 
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-outline'}`} 
              style={{ flex: 1, padding: '0.4rem', border: 'none', background: theme === 'dark' ? undefined : 'transparent' }} 
              onClick={() => toggleTheme('dark')}
              title="Dark Theme"
            >
              <Moon size={14} />
            </button>
            <button 
              className={`btn ${theme === 'medium' ? 'btn-primary' : 'btn-outline'}`} 
              style={{ flex: 1, padding: '0.4rem', border: 'none', background: theme === 'medium' ? undefined : 'transparent' }} 
              onClick={() => toggleTheme('medium')}
              title="Medium Theme"
            >
              <Monitor size={14} />
            </button>
            <button 
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-outline'}`} 
              style={{ flex: 1, padding: '0.4rem', border: 'none', background: theme === 'light' ? undefined : 'transparent' }} 
              onClick={() => toggleTheme('light')}
              title="Light Theme"
            >
              <Sun size={14} />
            </button>
          </div>

          <button 
            className="btn btn-outline" 
            onClick={toggleLanguage}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <Languages size={16} />
            {language === 'en' ? 'العربية' : 'English'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user.role === 'admin' ? t('admin') : t('staff')}</div>
            </div>
          </div>
          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={logout}
          >
            <LogOut size={16} /> {t('signOut')}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="header">
          <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
        </header>

        <section className="content-area">
          {activeTab === 'orders'    && <OrdersTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'sla'       && <SLATab />}
          {activeTab === 'penalties' && <ParkedPenaltiesTab />}
          {activeTab === 'basata'    && <BasataTab />}
          {activeTab === 'bosta'     && <BostaTab />}
          {activeTab === 'returned'  && <ReturnedTab />}
          {activeTab === 'calls'     && <CallsLogTab />}
          {activeTab === 'analytics' && user?.role === 'admin' && <AnalyticsTab />}
          {activeTab === 'logs'      && user?.role === 'admin' && <LogsTab />}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <DashboardProvider>
            <AppContent />
          </DashboardProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
