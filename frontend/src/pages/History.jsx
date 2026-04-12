import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  SENSOR_CONFIG, getSensorStatus, getAllSensorReadings, getReadingsByDateRange, getThresholds,
} from '../api/api';

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

function formatDateTime(iso) {
  return new Date(iso).toLocaleString();
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')} `
    + `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/** Format a Date to the value expected by <input type="datetime-local"> */
function toDatetimeLocal(date) {
  const d = new Date(date);
  const pad = n => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ChartTooltip({ active, payload, label, unit, color }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="detail-tooltip">
      <div className="detail-tooltip__time">{label}</div>
      <div className="detail-tooltip__val" style={{ color }}>
        {parseFloat(payload[0].value).toFixed(1)} {unit}
      </div>
    </div>
  );
}

function SensorHistoryChart({ type }) {
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

      const readings = await getReadingsByDateRange(type, from, to);
      if (!mounted) return;

      const spanMin = readings.length > 1
        ? (new Date(readings[readings.length - 1].recorded_at) - new Date(readings[0].recorded_at)) / 60_000
        : 0;

      setChartData(readings.map(r => ({
        time: spanMin > 1440 ? formatDateShort(r.recorded_at) : formatTime(r.recorded_at),
        value: r.value,
      })));
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [type, mode, presetIndex, appliedRange]);

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
              Showing: {appliedRange.from.toLocaleString()} — {appliedRange.to.toLocaleString()}
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
              dataKey="time"
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
  const [readings, setReadings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await getAllSensorReadings(150);
      if (mounted) {
        setReadings(data);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = filter === 'all'
    ? readings
    : readings.filter(r => r.sensor_type === filter);

  const counts = {
    all: readings.length,
    temperature: readings.filter(r => r.sensor_type === 'temperature').length,
    humidity: readings.filter(r => r.sensor_type === 'humidity').length,
    light: readings.filter(r => r.sensor_type === 'light').length,
  };

  const alertCount = readings.filter(
    r => getSensorStatus(r.sensor_type, r.value) === 'alert'
  ).length;

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-subtitle">All sensor readings from your safe</p>
        </div>
        {alertCount > 0 && (
          <div className="history-alert-badge">
            {alertCount} alert{alertCount !== 1 ? 's' : ''} detected
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="history-summary">
        {['temperature', 'humidity', 'light'].map(type => {
          const cfg = SENSOR_CONFIG[type];
          const typeReadings = readings.filter(r => r.sensor_type === type);
          const alerts = typeReadings.filter(
            r => getSensorStatus(type, r.value) === 'alert'
          ).length;
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
              {alerts > 0 && (
                <span className="history-summary-card__alert">{alerts} alerts</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Sensor charts ── */}
      <div className="history-charts">
        {SENSOR_TYPES.map(type => (
          <SensorHistoryChart key={type} type={type} />
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
              {filtered.slice(0, 100).map((r, i) => {
                const cfg = SENSOR_CONFIG[r.sensor_type];
                const s = getSensorStatus(r.sensor_type, r.value);
                return (
                  <tr key={i}>
                    <td className="td-mono">{formatDateTime(r.recorded_at)}</td>
                    <td>
                      <span
                        className="sensor-pill"
                        style={{ color: cfg?.color, background: `${cfg?.color}1a` }}
                      >
                        {cfg?.label ?? r.sensor_type}
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
          {filtered.length > 100 && (
            <p className="table-truncate-note">Showing 100 of {filtered.length} records</p>
          )}
        </div>
      )}
    </div>
  );
}
