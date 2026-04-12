import { createContext, useContext, useState, useCallback } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/api';

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = sessionStorage.getItem('staysafe_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadSession());

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    const session = { user: data.user, token: data.token };
    sessionStorage.setItem('staysafe_auth', JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await apiRegister(username, email, password);
    const session = { user: data.user, token: data.token };
    sessionStorage.setItem('staysafe_auth', JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('staysafe_auth');
    setAuth(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth?.user ?? null, token: auth?.token ?? null, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
