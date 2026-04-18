import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SensorCard from '../components/SensorCard';
import ProtectionSwitch from '../components/ProtectionSwitch';
import {
  getReadingsByDateRange,
  getSensorStatus,
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
  const [sensorData, setSensorData] = useState(INITIAL_STATE);
  const [protection, setProtection] = useState(true);
  const [sensorEnabled, setSensorEnabled] = useState(INITIAL_ENABLED);
  const [loading, setLoading] = useState(true);
  const [pollRate, setPollRate] = useState(5_000);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const now = new Date();
      const from = new Date(now - 10 * 60_000);
      const [tempReadings, humReadings, lightReadings, protStatus, controls] = await Promise.all([
        getReadingsByDateRange('temperature', from, now),
        getReadingsByDateRange('humidity', from, now),
        getReadingsByDateRange('light', from, now),
        getProtectionStatus(),
        getSensorControls().catch(() => []),
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
        controls.forEach(c => { if (c.sensorType in enabled) enabled[c.sensorType] = c.isEnabled; });
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
  }, [pollRate]);

  async function handleProtectionToggle(value) {
    setProtection(value);
    await toggleProtection(1, value);
  }

  async function handleSensorToggle(type, value) {
    setSensorEnabled(prev => ({ ...prev, [type]: value }));
    await toggleSensorEnabled(type, value);
  }

  const overallOk = SENSOR_TYPES.every(t => sensorData[t].status === 'ok');

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
      <div className={`overall-status overall-status--${overallOk ? 'ok' : 'alert'}`}>
        <span className={`status-dot status-dot--${overallOk ? 'ok' : 'alert'}`} />
        <span>
          {overallOk
            ? 'All systems normal — safe is secure'
            : 'Alert — one or more sensors require attention'}
        </span>
      </div>

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
