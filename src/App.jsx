import React, { useState } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Package, Users, Clock, AlertTriangle, BarChart3, LayoutDashboard, Zap, LogOut, Shield } from 'lucide-react';
import OrdersTab from './tabs/OrdersTab';
import CustomersTab from './tabs/CustomersTab';
import SLATab from './tabs/SLATab';
import ParkedPenaltiesTab from './tabs/ParkedPenaltiesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ReturnedTab from './tabs/ReturnedTab';
import BasataTab from './tabs/BasataTab';
import BostaTab from './tabs/BostaTab';
import LoginPage from './pages/LoginPage';

function AppContent() {
  const [activeTab, setActiveTab] = useState('orders');
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'var(--text-muted)' }}>Loading FCF Mosaam...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const tabs = [
    { id: 'orders', label: 'Orders Inventory', icon: <Package size={20} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={20} /> },
    { id: 'sla', label: 'Delivery SLA', icon: <Clock size={20} /> },
    { id: 'penalties', label: 'Parked Penalties', icon: <AlertTriangle size={20} /> },
    { id: 'basata', label: 'Basata POS', icon: <Zap size={20} /> },
    { id: 'bosta', label: 'Bosta Orders', icon: <Package size={20} /> },
    { id: 'returned', label: 'Returned to Jumia', icon: <Package size={20} /> },
    ...(user?.role === 'admin' ? [{ id: 'analytics', label: 'Analytics Insights', icon: <BarChart3 size={20} /> }] : []),
  ];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '1rem 0', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            FCF <span style={{ color: 'var(--color-accent)' }}>Mosaam</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <LayoutDashboard size={24} color="white" />
            </div>
            <h1 style={{ fontSize: '1.25rem', color: 'white' }}>Jumia <span style={{ color: 'var(--color-primary)' }}>Station</span></h1>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ background: activeTab === tab.id ? undefined : 'transparent', border: activeTab === tab.id ? undefined : 'none', textAlign: 'left', width: '100%' }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* User Info + Logout */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{user.username}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user.role}</div>
            </div>
          </div>
          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.3)' }}
            onClick={logout}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        <header className="header">
          <h2>{tabs.find(t => t.id === activeTab)?.label}</h2>
        </header>

        <section className="content-area">
          {activeTab === 'orders' && <OrdersTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'sla' && <SLATab />}
          {activeTab === 'penalties' && <ParkedPenaltiesTab />}
          {activeTab === 'basata' && <BasataTab />}
          {activeTab === 'bosta' && <BostaTab />}
          {activeTab === 'returned' && <ReturnedTab />}
          {activeTab === 'analytics' && user?.role === 'admin' && <AnalyticsTab />}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <AppContent />
      </DashboardProvider>
    </AuthProvider>
  );
}
