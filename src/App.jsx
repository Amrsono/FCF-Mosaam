import React, { useState } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { Package, Users, Clock, AlertTriangle, BarChart3, LayoutDashboard, Zap } from 'lucide-react';
import OrdersTab from './tabs/OrdersTab';
import CustomersTab from './tabs/CustomersTab';
import SLATab from './tabs/SLATab';
import ParkedPenaltiesTab from './tabs/ParkedPenaltiesTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ReturnedTab from './tabs/ReturnedTab';
import BasataTab from './tabs/BasataTab';

function AppContent() {
  const [activeTab, setActiveTab] = useState('orders');

  const tabs = [
    { id: 'orders', label: 'Orders Inventory', icon: <Package size={20} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={20} /> },
    { id: 'sla', label: 'Delivery SLA', icon: <Clock size={20} /> },
    { id: 'penalties', label: 'Parked Penalties', icon: <AlertTriangle size={20} /> },
    { id: 'basata', label: 'Basata POS', icon: <Zap size={20} /> },
    { id: 'returned', label: 'Returned to Jumia', icon: <Package size={20} /> },
    { id: 'analytics', label: 'Analytics Insights', icon: <BarChart3 size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
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

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
          {activeTab === 'returned' && <ReturnedTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
}
