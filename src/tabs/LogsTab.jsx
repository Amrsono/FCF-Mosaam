import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Search, Filter, Download, Users, X, CheckCircle, AlertCircle as AlertIcon } from 'lucide-react';
import { exportToExcel } from '../utils/exportUtils';

export default function LogsTab() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // User Management State
  const [showUserModal, setShowUserModal] = useState(false);
  const [allUsersList, setAllUsersList] = useState([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userUpdateStatus, setUserUpdateStatus] = useState({ type: '', message: '' });

  // Filters
  const [searchUser, setSearchUser] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('fcf_token');
      const res = await fetch('/api/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsUsersLoading(true);
      const token = localStorage.getItem('fcf_token');
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setAllUsersList(data);
    } catch (err) {
      setUserUpdateStatus({ type: 'error', message: err.message });
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleUpdateUserBranch = async (username, newOutlet) => {
    try {
      setUserUpdateStatus({ type: '', message: '' });
      const token = localStorage.getItem('fcf_token');
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, outlet: newOutlet })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update user');
      }
      
      setUserUpdateStatus({ type: 'success', message: t('successUpdateUser') });
      fetchUsers(); // Refresh list
      fetchLogs();  // Refresh logs to show the update action
    } catch (err) {
      setUserUpdateStatus({ type: 'error', message: err.message });
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchUser = log.username.toLowerCase().includes(searchUser.toLowerCase());
    const matchAction = log.action.toLowerCase().includes(searchAction.toLowerCase());
    const matchDate = dateFilter ? log.createdAt.startsWith(dateFilter) : true;
    return matchUser && matchAction && matchDate;
  });

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueUsers = [...new Set(logs.map(l => l.username))];

  return (
    <div className="tab-pane" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'var(--color-primary)', padding: '0.5rem', borderRadius: 'var(--radius-md)' }}>
              <ShieldAlert size={24} color="white" />
            </div>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{t('logs')}</h2>
          </div>

          {user?.role === 'admin' && (
            <button 
              className="btn btn-primary" 
              onClick={() => { setShowUserModal(true); fetchUsers(); }}
              style={{ gap: '0.5rem', display: 'flex', alignItems: 'center' }}
            >
              <Users size={18} />
              <span>{t('manageUsers') || 'Manage Users'}</span>
            </button>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <div className="input-icon"><Search size={16} /></div>
            <select 
              value={searchUser} 
              onChange={e => setSearchUser(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
            >
              <option value="">{t('allUsers')}</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <div className="input-icon"><Filter size={16} /></div>
            <select 
              value={searchAction} 
              onChange={e => setSearchAction(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
            >
              <option value="">{t('allActions')}</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="input-group" style={{ flex: '1 1 200px' }}>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-primary)' }}
            />
          </div>

          <button
            className="btn btn-outline"
            style={{ color: 'var(--color-success)', borderColor: 'rgba(50,255,100,0.3)', padding: '0.5rem 1rem', fontSize: '0.85rem', alignSelf: 'flex-end', gap: '0.4rem' }}
            onClick={() => exportToExcel(
              filteredLogs.map(log => {
                let parsedAmount = null;
                try {
                  const det = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                  if (det && det.amount !== undefined) parsedAmount = Number(det.amount);
                } catch {}
                return { ...log, _amount: parsedAmount !== null ? parsedAmount : '-' };
              }),
              [
                { label: language === 'ar' ? 'تاريخ' : 'Date',    accessor: l => new Date(l.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' }) },
                { label: language === 'ar' ? 'الوقت' : 'Time',    accessor: l => new Date(l.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' }) },
                { label: language === 'ar' ? 'المستخدم' : 'User',   accessor: 'username' },
                { label: language === 'ar' ? 'الإجراء' : 'Action', accessor: 'action' },
                { label: language === 'ar' ? 'رقم الطلب' : 'Order ID', accessor: l => {
                  try {
                    const det = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                    return det?.id || det?.orderId || det?.transactionId || '-';
                  } catch { return '-'; }
                }},
                { label: language === 'ar' ? 'المبلغ' : 'Amount (EGP)', accessor: '_amount' },
                { label: language === 'ar' ? 'التفاصيل' : 'Details', accessor: l => l.details || '-' },
              ],
              `System_Logs_Export_${new Date().toISOString().slice(0,10)}`
            )}
            title={language === 'ar' ? 'تصدير إلى إكسيل' : 'Export to Excel'}
          >
            <Download size={15} />
            {language === 'ar' ? 'تصدير إكسيل' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>{t('loading')}</div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>{error}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  <th>{t('user')}</th>
                  <th>{t('action')}</th>
                  <th>{language === 'ar' ? 'رقم الطلب' : 'Order Number'}</th>
                  <th>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th>{t('details')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>{t('noData')}</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => {
                    let parsedAmount = null;
                    let orderId = '-';
                    try {
                      const det = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                      if (det && det.amount !== undefined && det.amount !== null) {
                        parsedAmount = Number(det.amount);
                      }
                      orderId = det?.id || det?.orderId || det?.transactionId || '-';
                    } catch {}
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 500 }}>{new Date(log.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' })}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' })}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)' }}>
                            {log.username}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{log.action}</td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: orderId !== '-' ? 'var(--color-primary)' : 'var(--text-muted)' }}>
                          {orderId}
                        </td>
                        <td style={{ fontWeight: 700, color: parsedAmount !== null && parsedAmount > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                          {parsedAmount !== null ? `${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP` : '-'}
                        </td>
                        <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }} title={log.details}>
                          {log.details || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Management Modal */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: 'white' }}>{t('userBranchAssignment')}</h3>
              <button className="btn-icon" onClick={() => setShowUserModal(false)}><X size={20} /></button>
            </div>

            {userUpdateStatus.message && (
              <div style={{ 
                padding: '1rem', 
                borderRadius: 'var(--radius-md)', 
                background: userUpdateStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: userUpdateStatus.type === 'success' ? '#4ade80' : '#f87171',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                border: `1px solid ${userUpdateStatus.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {userUpdateStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertIcon size={18} />}
                {userUpdateStatus.message}
              </div>
            )}

            <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isUsersLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>{t('loading')}</div>
              ) : allUsersList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>{t('noData')}</div>
              ) : (
                allUsersList.map(u => (
                  <div key={u.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'white' }}>{u.username}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.role}</div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select 
                        value={u.outlet}
                        onChange={(e) => handleUpdateUserBranch(u.username, e.target.value)}
                        className="input-field"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: 'auto', minWidth: '130px' }}
                      >
                        <option value="eltalg">{t('eltalg')}</option>
                        <option value="tegara">{t('tegara')}</option>
                        <option value="mostashfa">{t('mostashfa')}</option>
                      </select>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={() => setShowUserModal(false)}>{language === 'ar' ? 'تم' : 'OK'}</button>
              <button className="btn btn-outline" onClick={() => setShowUserModal(false)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
