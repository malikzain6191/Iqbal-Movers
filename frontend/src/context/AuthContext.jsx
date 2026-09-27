import { createContext, useContext, useEffect, useState } from 'react';
import * as authApi from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('tms_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('tms_token')) return;
    let active = true;
    authApi.getCurrentUser().then(({ data }) => {
      if (!active) return;
      localStorage.setItem('tms_user', JSON.stringify(data.user));
      setUser(data.user);
    }).catch(() => {
      if (!active) return;
      localStorage.removeItem('tms_token');
      localStorage.removeItem('tms_user');
      setUser(null);
    });
    return () => { active = false; };
  }, []);

  async function login(username, password) {
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(username, password);
      localStorage.setItem('tms_token', data.token);
      localStorage.setItem('tms_user', JSON.stringify(data.user));
      setUser(data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    setUser(null);
  }

  const hasRole = (...roles) => user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, login, logout, error, loading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
