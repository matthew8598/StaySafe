/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";
import { login as apiLogin, register as apiRegister } from "../api/api";

const AuthContext = createContext(null);

function loadSession() {
  try {
    const raw = sessionStorage.getItem("staysafe_auth");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    // A valid authenticated session must contain both user and token.
    if (!parsed?.user || !parsed?.token) {
      return null;
    }

    return parsed;
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

    if (!data?.token) {
      throw new Error("Login did not return an authentication token.");
    }

    const session = {
      user: data.user,
      token: data.token,
    };

    sessionStorage.setItem("staysafe_auth", JSON.stringify(session));
    setAuth(session);
    return session;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await apiRegister(username, email, password);

    // Backend registration currently returns only user info.
    // If token is missing, perform login to obtain JWT for protected endpoints.
    const authData = data?.token ? data : await apiLogin(email, password);

    if (!authData?.token) {
      throw new Error("Registration succeeded but authentication token is missing.");
    }

    const session = {
      user: authData.user ?? data.user,
      token: authData.token,
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
