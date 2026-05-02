import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SensorCard from '../components/SensorCard';
import ProtectionSwitch from '../components/ProtectionSwitch';
import AddDeviceModal from '../components/AddDeviceModal';
import { useAuth } from '../context/AuthContext';
import { useAlertCenter } from '../context/AlertCenterContext';
import {
  getReadingsByDateRange,
  getSensorStatus,
  setThresholds,
  getProtectionStatus,
  toggleProtection,
  getSensorControls,
  toggleSensorEnabled,
} from '../api/api';

const SENSOR_TYPES = ['temperature', 'humidity', 'light'];

const INITIAL_STATE = {
  temperature: { readings: [], current: null, status: 'ok' },
  humidity: { readings: [], current: null, status: 'ok' },
  light: { readings: [], current: null, status: 'ok' },
};

const INITIAL_ENABLED = { temperature: true, humidity: true, light: true };

const POLL_RATES = [
  { label: '2s',  ms: 2_000 },
  { label: '5s',  ms: 5_000 },
  { label: '10s', ms: 10_000 },
  { label: '30s', ms: 30_000 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { device, deviceChecked, setDevice } = useAuth();
  const { alerts, activeAlertCount } = useAlertCenter();
  const deviceId = device?.id;
  const [sensorData, setSensorData] = useState(INITIAL_STATE);
  const [protection, setProtection] = useState(true);
  const [sensorEnabled, setSensorEnabled] = useState(INITIAL_ENABLED);
  const [loading, setLoading] = useState(true);
  const [pollRate, setPollRate] = useState(5_000);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let mounted = true;

    async function load() {
      const now = new Date();
      const from = new Date(now - 10 * 60_000);
      const [tempReadings, humReadings, lightReadings, protStatus, controls] = await Promise.all([
        getReadingsByDateRange('temperature', from, now, deviceId),
        getReadingsByDateRange('humidity', from, now, deviceId),
        getReadingsByDateRange('light', from, now, deviceId),
        getProtectionStatus(deviceId),
        getSensorControls(deviceId).catch(() => []),
      ]);

      if (!mounted) return;

      function processReadings(readings, type) {
        const current = readings.length ? readings[readings.length - 1].value : null;
        return {
          readings,
          current,
          status: current !== null ? getSensorStatus(type, current) : 'ok',
        };
      }

      setSensorData({
        temperature: processReadings(tempReadings, 'temperature'),
        humidity: processReadings(humReadings, 'humidity'),
        light: processReadings(lightReadings, 'light'),
      });
      setProtection(protStatus.isEnabled);

      if (controls.length > 0) {
        const enabled = { ...INITIAL_ENABLED };
        controls.forEach((c) => {
          if (c.sensorType in enabled) {
            enabled[c.sensorType] = c.isEnabled;

            if (
              typeof c.thresholdMin === "number"
              && typeof c.thresholdMax === "number"
              && c.thresholdMin < c.thresholdMax
            ) {
              setThresholds(c.sensorType, c.thresholdMin, c.thresholdMax);
            }
          }
        });
        setSensorEnabled(enabled);
      }

      setLoading(false);
    }

    load();
    const interval = setInterval(load, pollRate);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [deviceId, pollRate]);

  function handleDeviceAdded(newDevice) {
    setDevice(newDevice);
    setLoading(true);
    setShowAddModal(false);
  }

  async function handleProtectionToggle(value) {
    const previousProtection = protection;
    setProtection(value);
    try {
      await toggleProtection(deviceId, value);
    } catch {
      setProtection(previousProtection);
    }
  }

  async function handleSensorToggle(type, value) {
    const previousValue = sensorEnabled[type];
    setSensorEnabled(prev => ({ ...prev, [type]: value }));
    try {
      await toggleSensorEnabled(type, value, deviceId);
    } catch {
      setSensorEnabled(prev => ({ ...prev, [type]: previousValue }));
    }
  }

  const hasNoDataAlert = alerts.some((alert) => (
    alert.sensorType === 'system'
    || /no new sensor data/i.test(alert.message)
  ));
  const hasSensorAlert = SENSOR_TYPES.some(t => sensorData[t].status === 'alert');
  const overallMode = hasNoDataAlert
    ? 'alert'
    : (!protection ? 'paused' : (hasSensorAlert ? 'alert' : 'ok'));

  function getOverallMessage() {
    if (hasNoDataAlert) {
      return 'Device not sending data - Safe might be compromised';
    }
    if (overallMode === 'ok') {
      return 'All systems normal — safe is secure';
    }
    if (overallMode === 'alert') {
      return 'Alert — one or more sensors require attention';
    }
    return 'Safe protection is disabled — alert generation is paused';
  }

  // ── Phase guards ──

  if (!deviceChecked) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        Loading…
      </div>
    );
  }

  if (!device) {
    return (
      <div className="dashboard">
        <div className="dashboard-empty">
          <div className="dashboard-empty__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="dashboard-empty__title">No device registered</h2>
          <p className="dashboard-empty__sub">Add your StaySafe device to start monitoring.</p>
          <button className="dashboard-empty__btn" onClick={() => setShowAddModal(true)}>
            + Add Device
          </button>
        </div>
        {showAddModal && (
          <AddDeviceModal
            onDeviceAdded={handleDeviceAdded}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        Loading sensor data…
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* ── Overall status banner ── */}
      <div className={`overall-status overall-status--${overallMode}`}>
        <span className={`status-dot status-dot--${overallMode}`} />
        <span>{getOverallMessage()}</span>
      </div>

      {activeAlertCount > 0 && (
        <div className="dashboard-alert-banner" role="alert">
          <span className="dashboard-alert-banner__icon">!</span>
          <span>
            {activeAlertCount} unresolved alert{activeAlertCount === 1 ? '' : 's'} detected.
          </span>
          <button
            className="dashboard-alert-banner__action"
            onClick={() => navigate('/alerts')}
          >
            Review alerts
          </button>
        </div>
      )}

      {/* ── Dashboard header ── */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time safe monitoring</p>
        </div>
        <div className="dashboard-header__controls">
          <div className="poll-rate">
            <span className="poll-rate__label">Refresh</span>
            <div className="poll-rate__group">
              {POLL_RATES.map(r => (
                <button
                  key={r.ms}
                  className={`poll-rate__btn${pollRate === r.ms ? ' poll-rate__btn--active' : ''}`}
                  onClick={() => setPollRate(r.ms)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <ProtectionSwitch enabled={protection} onToggle={handleProtectionToggle} />
        </div>
      </div>

      {/* ── Sensor cards ── */}
      <div className="sensor-grid">
        {SENSOR_TYPES.map(type => (
          <SensorCard
            key={type}
            type={type}
            data={sensorData[type]}
            enabled={sensorEnabled[type]}
            onToggleEnabled={value => handleSensorToggle(type, value)}
            onClick={() => navigate(`/sensor/${type}`)}
          />
        ))}
      </div>
    </div>
  );
}
