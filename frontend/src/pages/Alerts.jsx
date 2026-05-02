import { useState } from "react";
import { Navigate } from "react-router-dom";
import { SENSOR_CONFIG } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useAlertCenter } from "../context/AlertCenterContext";
import { formatDateTime } from "../utils/dateTime";

export default function Alerts() {
  const { device, deviceChecked } = useAuth();
  const { alerts, activeAlertCount, loading, error, markAlertResolved } = useAlertCenter();
  const [resolvingId, setResolvingId] = useState(null);

  async function handleResolve(alertId) {
    setResolvingId(alertId);
    try {
      await markAlertResolved(alertId);
    } finally {
      setResolvingId(null);
    }
  }

  if (!deviceChecked) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        Loading…
      </div>
    );
  }

  if (!device) return <Navigate to="/dashboard" replace />;

  return (
    <div className="alerts-page">
      <div className="alerts-header">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Active anomalies requiring review and resolution.</p>
        </div>
        <div className="alerts-header__count">
          {activeAlertCount} active issue{activeAlertCount !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="alerts-note">
        Safe Protection disables alert generation while the safe is intentionally opened.
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loading && !alerts.length ? (
        <div className="page-loading">
          <div className="spinner" />
          Loading alerts…
        </div>
      ) : alerts.length === 0 ? (
        <div className="alerts-empty">
          <h2 className="alerts-empty__title">No active alerts</h2>
          <p className="alerts-empty__subtitle">
            Current anomalies have been resolved, or protection is disabled for intentional safe access.
          </p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => {
            const cfg = SENSOR_CONFIG[alert.sensorType];
            const isResolving = resolvingId === alert.id;
            const isResolvable = alert.canResolve !== false;
            const pillColor = cfg?.color || "#94a3b8";
            const pillLabel = cfg?.label || alert.sensorType;
            return (
              <article key={alert.id} className="alert-card">
                <div className="alert-card__header">
                  <span className="sensor-pill" style={{ color: pillColor, background: `${pillColor}1a` }}>
                    {pillLabel}
                  </span>
                  <span className="alert-card__time">{formatDateTime(alert.triggeredAt)}</span>
                </div>

                <p className="alert-card__message">{alert.message}</p>

                <div className="alert-card__meta">Device: {device.name || `#${device.id}`}</div>

                <div className="alert-card__actions">
                  <button
                    className="alert-resolve-btn"
                    onClick={() => handleResolve(alert.id)}
                    disabled={isResolving || !isResolvable}
                    title={isResolvable ? "" : "This alert is computed from live telemetry and auto-clears after new readings."}
                  >
                    {!isResolvable ? "Auto-resolves on new data" : (isResolving ? "Resolving…" : "Mark as resolved")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
