/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, register as apiRegister } from "../api/api";

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = sessionStorage.getItem("staysafe_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadSession());
  const [device, _setDevice] = useState(null);
  const [deviceChecked, setDeviceChecked] = useState(false);

  const setDevice = useCallback((dev) => {
    _setDevice(dev);
    setDeviceChecked(true);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);

    const session = {
      user: data.user,
      token: data.token || null,
    };

    sessionStorage.setItem("staysafe_auth", JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await apiRegister(username, email, password);

    const session = {
      user: data.user,
      token: data.token || null,
    };

    sessionStorage.setItem("staysafe_auth", JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("staysafe_auth");
    setAuth(null);
    _setDevice(null);
    setDeviceChecked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: auth?.user ?? null,
        token: auth?.token ?? null,
        device,
        deviceChecked,
        setDevice,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
