import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SensorCard from '../components/SensorCard';
import ProtectionSwitch from '../components/ProtectionSwitch';
import {
  getRecentReadings,
  getSensorStatus,
  getProtectionStatus,
  toggleProtection,
} from '../api/api';

const SENSOR_TYPES = ['temperature', 'humidity', 'light'];

const INITIAL_STATE = {
  temperature: { readings: [], current: null, status: 'ok' },
  humidity: { readings: [], current: null, status: 'ok' },
  light: { readings: [], current: null, status: 'ok' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [sensorData, setSensorData] = useState(INITIAL_STATE);
  const [protection, setProtection] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [tempReadings, humReadings, lightReadings, protStatus] = await Promise.all([
        getRecentReadings('temperature', 10),
        getRecentReadings('humidity', 10),
        getRecentReadings('light', 10),
        getProtectionStatus(),
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
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  async function handleProtectionToggle(value) {
    setProtection(value);
    await toggleProtection(1, value);
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
        <ProtectionSwitch enabled={protection} onToggle={handleProtectionToggle} />
      </div>

      {/* ── Sensor cards ── */}
      <div className="sensor-grid">
        {SENSOR_TYPES.map(type => (
          <SensorCard
            key={type}
            type={type}
            data={sensorData[type]}
            onClick={() => navigate(`/sensor/${type}`)}
          />
        ))}
      </div>
    </div>
  );
}
