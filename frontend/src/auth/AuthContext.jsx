import { createContext, useContext, useEffect, useRef, useState } from 'react';
import api from '../lib/api';

/**
 * Authentication context.
 *
 * On first load the app calls GET /api/auth/me. If the session cookie is still
 * valid the user is returned and we go straight to the dashboard; otherwise we
 * land on login. Any later 401 (e.g. an expired session on a background call)
 * invalidates the session and returns the user to login, making the SPA
 * session-aware without polling.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const heardUnauthorized = useRef(false);

  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (active) setUser(res.data.data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setInitialized(true);
      });

    const onUnauthorized = () => {
      if (heardUnauthorized.current) return;
      heardUnauthorized.current = true;
      setUser(null);
      // Allow the next valid session to re-arm the guard.
      setTimeout(() => {
        heardUnauthorized.current = false;
      }, 1000);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('auth:unauthorized', onUnauthorized);
    };
  }, []);

  async function login(email, password) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { email, password });
      setUser(res.data.data.user);
      return res.data.data.user;
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to sign in.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore network errors on logout; we clear local state regardless
    } finally {
      setUser(null);
    }
  }

  const value = { user, initialized, loading, error, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
