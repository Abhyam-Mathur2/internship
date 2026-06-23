import { createContext, useContext, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('payroll_user') || 'null'));

  const value = useMemo(() => ({
    user,
    isAdmin: user?.role === 'admin',
    async login(payload) {
      const { data } = await api.post('/login', payload);
      localStorage.setItem('payroll_token', data.access_token);
      localStorage.setItem('payroll_user', JSON.stringify(data.user));
      setUser(data.user);
    },
    async register(payload) {
      const { data } = await api.post('/register', payload);
      localStorage.setItem('payroll_token', data.access_token);
      localStorage.setItem('payroll_user', JSON.stringify(data.user));
      setUser(data.user);
    },
    async logout() {
      try {
        await api.post('/logout');
      } finally {
        localStorage.removeItem('payroll_token');
        localStorage.removeItem('payroll_user');
        setUser(null);
      }
    },
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

