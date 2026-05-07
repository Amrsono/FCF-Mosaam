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
import LandingPage from './pages/LandingPage';

import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Languages, Moon, Sun, Monitor } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState('orders');
  const [currentService, setCurrentService] = useState('home');
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

  const allTabs = [
    { id: 'orders',    label: t('inventory'), icon: <Package size={20} />, service: 'jumia' },
    { id: 'customers', label: t('customers'), icon: <Users size={20} />, service: 'jumia' },
    { id: 'sla',       label: t('sla'),       icon: <Clock size={20} />, service: 'jumia' },
    { id: 'penalties', label: t('penalties'), icon: <AlertTriangle size={20} />, service: 'jumia' },
    { id: 'returned',  label: t('returned'),  icon: <Package size={20} />, service: 'jumia' },
    { id: 'basata',    label: t('basata'),    icon: <Zap size={20} />, service: 'basata' },
    { id: 'bosta',     label: t('bosta'),     icon: <Package size={20} />, service: 'bosta' },
    { id: 'calls',     label: t('callsLog'),  icon: <Phone size={20} />, service: 'admin' },
    ...(user?.role === 'admin' ? [
      { id: 'analytics', label: t('analytics'), icon: <BarChart3 size={20} />, service: 'admin' },
      { id: 'logs', label: t('logs'), icon: <Shield size={20} />, service: 'admin' }
    ] : []),
  ];

  const handleSelectService = (serviceId, tabId) => {
    setCurrentService(serviceId);
    setActiveTab(tabId);
  };

  const visibleTabs = currentService === 'home' 
    ? [] 
    : allTabs.filter(tab => tab.service === currentService);

  return (
    <div className="app-container" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Main Panel */}
      <main className="main-content">
        <header className="header">
          <button className="menu-toggle" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
          <h2>{currentService === 'home' ? t('selectService') : allTabs.find(t => t.id === activeTab)?.label}</h2>
        </header>

        <section className="content-area">
          {currentService === 'home' ? (
            <LandingPage onSelectService={handleSelectService} />
          ) : (
            <>
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
            </>
          )}
        </section>
      </main>

      {/* Mobile Overlay */}
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={() => setIsMobileMenuOpen(false)}>
          <X size={24} />
        </button>
        <div style={{ padding: '2rem 1.5rem 1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, padding: '0 1.25rem', overflowY: 'auto' }}>
          {currentService !== 'home' && (
            <button
              className="nav-item"
              onClick={() => setCurrentService('home')}
              style={{ 
                marginBottom: '1rem', 
                background: 'rgba(var(--color-primary-rgb), 0.1)', 
                color: 'var(--color-primary)',
                border: '1px dashed var(--color-primary)',
                justifyContent: 'center'
              }}
            >
              <LayoutDashboard size={20} />
              {t('backToHome')}
            </button>
          )}
          
          {visibleTabs.map((tab) => (
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

        {/* Sidebar Footer: Theme, Language, User, Logout */}
        <div style={{ 
          borderTop: '1px solid var(--border-color)', 
          padding: '1.25rem 1.25rem 2rem', 
          marginTop: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1.25rem',
          userSelect: 'none',
          background: 'rgba(0,0,0,0.05)'
        }}>
          
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Theme Switcher */}
            <div style={{ 
              display: 'flex', 
              background: 'var(--bg-main)', 
              borderRadius: '12px', 
              padding: '3px', 
              border: '1px solid var(--border-color)',
              flex: 1,
              height: '38px'
            }}>
              <button 
                className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`} 
                style={{ flex: 1, padding: 0, border: 'none', background: theme === 'dark' ? undefined : 'transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                onClick={() => toggleTheme('dark')}
                title="Dark Mode"
              >
                <Moon size={14} />
              </button>
              <button 
                className={`btn ${theme === 'medium' ? 'btn-primary' : ''}`} 
                style={{ flex: 1, padding: 0, border: 'none', background: theme === 'medium' ? undefined : 'transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                onClick={() => toggleTheme('medium')}
                title="Medium Mode"
              >
                <Monitor size={14} />
              </button>
              <button 
                className={`btn ${theme === 'light' ? 'btn-primary' : ''}`} 
                style={{ flex: 1, padding: 0, border: 'none', background: theme === 'light' ? undefined : 'transparent', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                onClick={() => toggleTheme('light')}
                title="Light Mode"
              >
                <Sun size={14} />
              </button>
            </div>

            {/* Language Toggle */}
            <button 
              className="btn btn-outline" 
              onClick={toggleLanguage}
              style={{ 
                width: '40px', 
                height: '38px',
                padding: 0,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              title={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
            >
              <Languages size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* User Profile Card */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.85rem', 
              padding: '0.85rem', 
              background: 'var(--bg-overlay)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '16px',
              width: '100%',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
              }}>
                <Shield size={20} color="white" />
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', background: 'transparent' }}>
                  {user.username}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize', background: 'transparent' }}>
                  {user.role === 'admin' ? t('admin') : t('staff')}
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              className="btn btn-outline"
              style={{ 
                width: '100%', 
                justifyContent: 'center', 
                color: 'var(--color-danger)', 
                borderColor: 'rgba(239,68,68,0.15)',
                height: '42px',
                fontSize: '0.88rem',
                borderRadius: '14px',
                background: 'rgba(239,68,68,0.02)'
              }}
              onClick={logout}
            >
              <LogOut size={16} /> 
              <span style={{ fontWeight: 600, background: 'transparent' }}>{t('signOut')}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <LanguageProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </LanguageProvider>
      </DashboardProvider>
    </AuthProvider>
  );
}
