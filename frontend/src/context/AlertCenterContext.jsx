/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getAlerts, resolveAlert, SENSOR_CONFIG } from "../api/api";
import { useAuth } from "./AuthContext";

const AlertCenterContext = createContext(null);
const POLL_INTERVAL_MS = 5000;

function getStorageKey(userId, deviceId) {
  return `staysafe_notified_alert_ids_${userId}_${deviceId}`;
}

function loadNotifiedIds(userId, deviceId) {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(userId, deviceId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(parsed.map(String));
  } catch {
    return new Set();
  }
}

export function AlertCenterProvider({ children }) {
  const { user, device } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const notifiedRef = useRef(new Set());

  const persistNotifiedIds = useCallback(() => {
    if (!user || !device || typeof window === "undefined") return;
    const ids = Array.from(notifiedRef.current);
    localStorage.setItem(getStorageKey(user.id, device.id), JSON.stringify(ids));
  }, [user, device]);

  const triggerBrowserNotifications = useCallback((rows) => {
    if (!rows.length || typeof window === "undefined") return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    let changed = false;
    rows.forEach((alert) => {
      const alertId = String(alert.id);
      if (alert.isRead || notifiedRef.current.has(alertId)) return;

      const sensorLabel = SENSOR_CONFIG[alert.sensorType]?.label || alert.sensorType;
      const body = `${sensorLabel}: ${alert.message}`;

      new Notification("StaySafe Alert", {
        body,
        tag: `staysafe-alert-${alertId}`,
      });

      notifiedRef.current.add(alertId);
      changed = true;
    });

    if (changed) persistNotifiedIds();
  }, [persistNotifiedIds]);

  const refreshAlerts = useCallback(async ({ quiet = false } = {}) => {
    if (!user || !device) {
      setAlerts([]);
      return;
    }

    if (!quiet) setLoading(true);

    try {
      const rows = await getAlerts(device.id, { isRead: false });
      setAlerts(rows);
      setError("");
      triggerBrowserNotifications(rows);
    } catch (err) {
      setError(err.message || "Failed to load alerts.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [device, triggerBrowserNotifications, user]);

  const markAlertResolved = useCallback(async (alertId) => {
    const updated = await resolveAlert(alertId);
    setAlerts((prev) => prev.filter((item) => String(item.id) !== String(alertId)));
    return updated;
  }, []);

  useEffect(() => {
    if (!user || !device) {
      notifiedRef.current = new Set();
      setAlerts([]);
      setError("");
      setLoading(false);
      return;
    }

    notifiedRef.current = loadNotifiedIds(user.id, device.id);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    let active = true;
    const load = async (quiet) => {
      await refreshAlerts({ quiet });
    };

    load(false);
    const interval = setInterval(() => {
      if (!active) return;
      load(true);
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [device, refreshAlerts, user]);

  const value = useMemo(() => ({
    alerts,
    activeAlertCount: alerts.length,
    loading,
    error,
    refreshAlerts,
    markAlertResolved,
  }), [alerts, loading, error, refreshAlerts, markAlertResolved]);

  return (
    <AlertCenterContext.Provider value={value}>
      {children}
    </AlertCenterContext.Provider>
  );
}

export function useAlertCenter() {
  const ctx = useContext(AlertCenterContext);
  if (!ctx) throw new Error("useAlertCenter must be used inside <AlertCenterProvider>");
  return ctx;
}
