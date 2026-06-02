import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

// Accounts that skip the outlet selection step
const isExempt = (user) =>
  user?.role === 'admin' || user?.username?.toLowerCase() === 'ezz';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [pendingUser, setPendingUser] = useState(null); // authenticated but awaiting outlet choice
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('fcf_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          const u = data.user;
          // Restore session outlet override if one was saved
          const sessionOutlet = localStorage.getItem('fcf_session_outlet');
          if (sessionOutlet && !isExempt(u)) {
            setUser({ ...u, outlet: sessionOutlet });
          } else {
            setUser(u);
          }
        })
        .catch(() => localStorage.removeItem('fcf_token'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160);
      throw new Error(
        snippet
          ? `Login failed (non-JSON response): ${snippet}`
          : `Login failed (${res.status})`
      );
    }

    if (!res.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('fcf_token', data.token);

    if (isExempt(data.user)) {
      // Admins / Ezz → log in immediately, no outlet step
      setUser(data.user);
    } else {
      // Agents → hold in pendingUser until they choose an outlet
      setPendingUser(data.user);
    }

    return data.user;
  };

  const confirmOutlet = async (outlet) => {
    if (!pendingUser) return;
    try {
      const token = localStorage.getItem('fcf_token');
      const res = await fetch('/api/auth/confirm-outlet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ outlet })
      });
      
      if (!res.ok) throw new Error('Failed to confirm session outlet');
      
      const data = await res.json();
      localStorage.setItem('fcf_token', data.token); // Store updated token signed with the chosen outlet
      localStorage.setItem('fcf_session_outlet', outlet);
      setUser(data.user);
      setPendingUser(null);
    } catch (err) {
      console.error("confirmOutlet Error:", err);
    }
  };

  /**
   * Called if the agent goes back from the outlet screen to re-enter credentials.
   */
  const cancelPendingLogin = () => {
    localStorage.removeItem('fcf_token');
    setPendingUser(null);
  };

  const logout = () => {
    localStorage.removeItem('fcf_token');
    localStorage.removeItem('fcf_session_outlet');
    setUser(null);
    setPendingUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, pendingUser, isLoading, login, logout, confirmOutlet, cancelPendingLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
