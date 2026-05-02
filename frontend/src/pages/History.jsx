import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  SENSOR_CONFIG, getSensorStatus, getAllSensorReadings, getReadingsByDateRange, getThresholds,
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatShortDateTime, formatTime } from '../utils/dateTime';

const FILTERS = [
  { key: 'all', label: 'All Sensors' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'humidity', label: 'Humidity' },
  { key: 'light', label: 'Light' },
];

const PRESETS = [
  { label: 'Last 30 min', minutes: 30 },
  { label: 'Last 1 hour', minutes: 60 },
  { label: 'Last 6 hours', minutes: 360 },
  { label: 'Last 24 hours', minutes: 1440 },
  { label: 'Last 7 days', minutes: 10080 },
  { label: 'All time', minutes: 43200 },
];

const SENSOR_TYPES = ['temperature', 'humidity', 'light'];
const TABLE_PAGE_SIZE = 200;
const INITIAL_ANOMALY_COUNTS = {
  temperature: 0,
  humidity: 0,
  light: 0,
};

/** Format a Date to the value expected by <input type="datetime-local"> */
function toDatetimeLocal(date) {
  const d = new Date(date);
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ChartTooltip({ active, payload, unit, color }) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  return (
    <div className="detail-tooltip">
      <div className="detail-tooltip__time">{formatDateTime(point.recordedAt)}</div>
      <div className="detail-tooltip__val" style={{ color }}>
        {parseFloat(payload[0].value).toFixed(1)} {unit}
      </div>
    </div>
  );
}

function SensorHistoryChart({ type, deviceId }) {
  const cfg = SENSOR_CONFIG[type];

  const nowInit = new Date();
  const [mode, setMode] = useState('preset');           // 'preset' | 'custom'
  const [presetIndex, setPresetIndex] = useState(1);    // default: Last 1 hour
  const [fromInput, setFromInput] = useState(toDatetimeLocal(new Date(nowInit - 24 * 60 * 60_000)));
  const [toInput, setToInput]     = useState(toDatetimeLocal(nowInit));
  const [appliedRange, setAppliedRange] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      let from, to;
      if (mode === 'preset') {
        to   = new Date();
        from = new Date(to - PRESETS[presetIndex].minutes * 60_000);
      } else {
        if (!appliedRange) { setLoading(false); return; }
        from = appliedRange.from;
        to   = appliedRange.to;
      }

      const readings = await getReadingsByDateRange(type, from, to, deviceId);
      if (!mounted) return;

      const spanMin = readings.length > 1
        ? (new Date(readings[readings.length - 1].recordedAt) - new Date(readings[0].recordedAt)) / 60_000
        : 0;

      setChartData(readings.map(r => ({
        recordedAt: r.recordedAt,
        axisLabel: spanMin > 1440 ? formatShortDateTime(r.recordedAt) : formatTime(r.recordedAt),
        value: r.value,
      })));
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [type, mode, presetIndex, appliedRange, deviceId]);

  function handleApply() {
    if (!fromInput || !toInput) { setRangeError('Please fill both fields.'); return; }
    const from = new Date(fromInput);
    const to   = new Date(toInput);
    if (isNaN(from) || isNaN(to)) { setRangeError('Invalid date.'); return; }
    if (from >= to) { setRangeError('Start must be before end.'); return; }
    setRangeError('');
    setAppliedRange({ from, to });
  }

  const gradId = `hist-grad-${type}`;
  const thresholds = getThresholds(type);
  const avg = chartData.length
    ? parseFloat((chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(1))
    : null;

  return (
    <div className="history-chart-block" style={{ borderTopColor: cfg.color }}>
      {/* ── Header row ── */}
      <div className="history-chart-block__header">
        <span className="history-chart-block__title" style={{ color: cfg.color }}>
          {cfg.label}
        </span>

        {/* Mode tabs */}
        <div className="chart-mode-tabs">
          <button
            className={`chart-mode-tab${mode === 'preset' ? ' chart-mode-tab--active' : ''}`}
            onClick={() => setMode('preset')}
            style={mode === 'preset' ? { borderColor: cfg.color, color: cfg.color } : {}}
          >
            Presets
          </button>
          <button
            className={`chart-mode-tab${mode === 'custom' ? ' chart-mode-tab--active' : ''}`}
            onClick={() => setMode('custom')}
            style={mode === 'custom' ? { borderColor: cfg.color, color: cfg.color } : {}}
          >
            Custom range
          </button>
        </div>
      </div>

      {/* ── Preset pills ── */}
      {mode === 'preset' && (
        <div className="range-selector" style={{ marginBottom: 14 }}>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              className={`range-btn${i === presetIndex ? ' range-btn--active' : ''}`}
              onClick={() => setPresetIndex(i)}
              style={i === presetIndex ? { borderColor: cfg.color, color: cfg.color } : {}}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Custom date-time range picker ── */}
      {mode === 'custom' && (
        <div className="custom-range-picker">
          <div className="custom-range-fields">
            <div className="custom-range-field">
              <label className="custom-range-label">From</label>
              <input
                type="datetime-local"
                className="datetime-input"
                value={fromInput}
                max={toInput}
                onChange={e => setFromInput(e.target.value)}
              />
            </div>
            <span className="custom-range-sep">→</span>
            <div className="custom-range-field">
              <label className="custom-range-label">To</label>
              <input
                type="datetime-local"
                className="datetime-input"
                value={toInput}
                min={fromInput}
                onChange={e => setToInput(e.target.value)}
              />
            </div>
            <button
              className="apply-btn"
              onClick={handleApply}
              style={{ borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` }}
            >
              Apply
            </button>
          </div>
          {rangeError && <p className="range-error">{rangeError}</p>}
          {appliedRange && !rangeError && (
            <p className="range-applied">
              Showing: {formatDateTime(appliedRange.from)} — {formatDateTime(appliedRange.to)}
            </p>
          )}
        </div>
      )}

      {/* ── Chart ── */}
      {loading ? (
        <div className="chart-loading"><div className="spinner" />Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="chart-loading">No data for selected range</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={cfg.color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={cfg.color} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252839" vertical={false} />
            <XAxis
              dataKey="axisLabel"
              stroke="#252839"
              tick={{ fill: '#8892a4', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#252839' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#252839"
              tick={{ fill: '#8892a4', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={v => `${v}${cfg.unit}`}
              domain={(() => {
                const allY = [...chartData.map(d => d.value), thresholds.min, thresholds.max];
                const lo = Math.min(...allY);
                const hi = Math.max(...allY);
                const p  = (hi - lo) * 0.12 || 1;
                return [lo - p, hi + p];
              })()}
            />
            <Tooltip content={<ChartTooltip unit={cfg.unit} color={cfg.color} />} />
            {/* threshold lines */}
            <ReferenceLine
              y={thresholds.min}
              stroke="#ef4444"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: `Min ${thresholds.min}${cfg.unit}`, position: 'insideBottomLeft', fill: '#ef4444', fontSize: 9 }}
            />
            <ReferenceLine
              y={thresholds.max}
              stroke="#ef4444"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{ value: `Max ${thresholds.max}${cfg.unit}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 9 }}
            />
            {/* average line */}
            {avg !== null && (
              <ReferenceLine
                y={avg}
                stroke="#94a3b8"
                strokeDasharray="2 5"
                strokeWidth={1.5}
                label={{ value: `Avg ${avg}${cfg.unit}`, position: 'insideTopRight', fill: '#94a3b8', fontSize: 9 }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={cfg.color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              dot={false}
              activeDot={{ r: 4, fill: cfg.color, stroke: '#1a1d2e', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const { device, deviceChecked } = useAuth();
  const deviceId = device?.id;
  const [readings, setReadings] = useState([]);
  const [anomalyCount7d, setAnomalyCount7d] = useState(0);
  const [anomalyCountsBySensor7d, setAnomalyCountsBySensor7d] = useState(INITIAL_ANOMALY_COUNTS);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    let mounted = true;
    async function load() {
      const to = new Date();
      const from = new Date(to.getTime() - 7 * 24 * 60 * 60_000);

      const [data, temp7d, humidity7d, light7d] = await Promise.all([
        getAllSensorReadings(TABLE_PAGE_SIZE, deviceId, 0),
        getReadingsByDateRange('temperature', from, to, deviceId),
        getReadingsByDateRange('humidity', from, to, deviceId),
        getReadingsByDateRange('light', from, to, deviceId),
      ]);

      const temperatureAnomalies = temp7d.filter(
        (reading) => getSensorStatus('temperature', reading.value) === 'alert',
      ).length;
      const humidityAnomalies = humidity7d.filter(
        (reading) => getSensorStatus('humidity', reading.value) === 'alert',
      ).length;
      const lightAnomalies = light7d.filter(
        (reading) => getSensorStatus('light', reading.value) === 'alert',
      ).length;
      const anomalies = temperatureAnomalies + humidityAnomalies + lightAnomalies;

      if (mounted) {
        setReadings(data);
        setOffset(data.length);
        setHasMore(data.length === TABLE_PAGE_SIZE);
        setAnomalyCount7d(anomalies);
        setAnomalyCountsBySensor7d({
          temperature: temperatureAnomalies,
          humidity: humidityAnomalies,
          light: lightAnomalies,
        });
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [deviceId]);

  const filtered = filter === 'all'
    ? readings
    : readings.filter(r => r.sensorType === filter);

  async function handleLoadMore() {
    if (!deviceId || loading || loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const next = await getAllSensorReadings(TABLE_PAGE_SIZE, deviceId, offset);
      setReadings(prev => [...prev, ...next]);
      setOffset(prev => prev + next.length);
      setHasMore(next.length === TABLE_PAGE_SIZE);
    } finally {
      setLoadingMore(false);
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

  const counts = {
    all: readings.length,
    temperature: readings.filter(r => r.sensorType === 'temperature').length,
    humidity: readings.filter(r => r.sensorType === 'humidity').length,
    light: readings.filter(r => r.sensorType === 'light').length,
  };
  const hasAnomalies7d = anomalyCount7d > 0;

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">All sensor readings from your safe</p>
        </div>
        <div className={`history-alert-badge ${hasAnomalies7d ? 'history-alert-badge--active' : 'history-alert-badge--ok'}`}>
          {anomalyCount7d} anomal{anomalyCount7d === 1 ? 'y' : 'ies'} detected in the last 7 days
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="history-summary">
        {['temperature', 'humidity', 'light'].map(type => {
          const cfg = SENSOR_CONFIG[type];
          const typeReadings = readings.filter(r => r.sensorType === type);
          const alerts7d = anomalyCountsBySensor7d[type] ?? 0;
          return (
            <button
              key={type}
              className="history-summary-card"
              onClick={() => navigate(`/sensor/${type}`)}
              style={{ borderTopColor: cfg.color }}
            >
              <span className="history-summary-card__name" style={{ color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="history-summary-card__count">{typeReadings.length} readings</span>
              <span className={`history-summary-card__alert${alerts7d > 0 ? '' : ' history-summary-card__alert--ok'}`}>
                {alerts7d} anomal{alerts7d === 1 ? 'y' : 'ies'} (7d)
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Sensor charts ── */}
      <div className="history-charts">
        {SENSOR_TYPES.map(type => (
          <SensorHistoryChart key={type} type={type} deviceId={deviceId} />
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        {FILTERS.map(f => {
          const cfg = f.key !== 'all' ? SENSOR_CONFIG[f.key] : null;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              className={`filter-btn${isActive ? ' filter-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
              style={isActive && cfg ? { borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` } : {}}
            >
              {f.label}
              <span className="filter-btn__count">{counts[f.key]}</span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
          Loading history…
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="readings-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Sensor</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const cfg = SENSOR_CONFIG[r.sensorType];
                const s = getSensorStatus(r.sensorType, r.value);
                return (
                  <tr key={`${r.id ?? 'r'}-${i}`}>
                    <td className="td-mono">{formatDateTime(r.recordedAt)}</td>
                    <td>
                      <span
                        className="sensor-pill"
                        style={{ color: cfg?.color, background: `${cfg?.color}1a` }}
                      >
                        {cfg?.label ?? r.sensorType}
                      </span>
                    </td>
                    <td className="td-mono" style={{ color: cfg?.color }}>
                      {parseFloat(r.value).toFixed(1)} {r.unit}
                    </td>
                    <td>
                      <span className={`table-badge table-badge--${s}`}>
                        {s === 'ok' ? 'Normal' : 'Alert'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-truncate-note" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span>Loaded {readings.length} records</span>
            {hasMore && (
              <button className="apply-btn" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
