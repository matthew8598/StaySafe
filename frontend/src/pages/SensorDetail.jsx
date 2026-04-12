import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { SENSOR_CONFIG, getSensorStatus, getHistoryReadings, getThresholds, setThresholds } from '../api/api';

const TIME_RANGES = [
  { label: '10 min', count: 10, interval: 1 },
  { label: '1 hour', count: 60, interval: 1 },
  { label: '24 hours', count: 144, interval: 10 },
];

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleString();
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

const SENSOR_ICONS = {
  temperature: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  ),
  humidity: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  light: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
};

function DetailTooltip({ active, payload, label, unit, color }) {
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

export default function SensorDetail() {
  const { type } = useParams();
  const navigate = useNavigate();
  const cfg = SENSOR_CONFIG[type];

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeIndex, setRangeIndex] = useState(0);

  // ── Threshold editor state ──
  const [thresholds, setThresholdsState] = useState(() => getThresholds(type));
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [threshSaved, setThreshSaved] = useState(false);
  const [threshError, setThreshError] = useState('');

  // Re-load thresholds if sensor type changes (e.g. via back-nav)
  useEffect(() => {
    const t = getThresholds(type);
    setThresholdsState(t);
    setEditMin(String(t.min));
    setEditMax(String(t.max));
  }, [type]);

  function handleSaveThresholds() {
    const mn = parseFloat(editMin);
    const mx = parseFloat(editMax);
    if (isNaN(mn) || isNaN(mx)) { setThreshError('Enter valid numbers.'); return; }
    if (mn >= mx) { setThreshError('Min must be less than Max.'); return; }
    setThreshError('');
    setThresholds(type, mn, mx);
    setThresholdsState({ min: mn, max: mx });
    setThreshSaved(true);
    setTimeout(() => setThreshSaved(false), 2000);
  }

  useEffect(() => {
    if (!cfg) {
      navigate('/dashboard');
      return;
    }
    let mounted = true;
    async function load() {
      setLoading(true);
      const range = TIME_RANGES[rangeIndex];
      const data = await getHistoryReadings(type, range.interval, range.count);
      if (mounted) {
        setReadings(data);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [type, rangeIndex, cfg, navigate]);

  if (!cfg) return null;

  const current = readings.length ? readings[readings.length - 1].value : undefined;
  const status = current !== undefined ? getSensorStatus(type, current) : 'ok';

  const values = readings.map(r => r.value);
  const minVal = values.length ? Math.min(...values).toFixed(1) : '—';
  const maxVal = values.length ? Math.max(...values).toFixed(1) : '—';
  const avgVal = values.length
    ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    : '—';

  const chartData = readings.map(r => ({
    time: formatTime(r.recorded_at),
    value: r.value,
  }));

  return (
    <div className="sensor-detail">
      <button className="back-btn" onClick={() => navigate('/dashboard')}>
        <BackIcon />
        Back to Dashboard
      </button>

      {/* ── Sensor header ── */}
      <div className="sensor-detail__header">
        <div className="sensor-detail__icon" style={{ color: cfg.color, background: `${cfg.color}1a` }}>
          {SENSOR_ICONS[type]}
        </div>
        <div className="sensor-detail__titles">
          <h1 className="page-title">{cfg.label}</h1>
          <p className="page-subtitle">Sensor Detail</p>
        </div>
        {current !== undefined && (
          <div className="sensor-detail__current">
            <span className="sensor-detail__current-value">
              {typeof current === 'number' ? current.toFixed(1) : current}
            </span>
            <span className="sensor-detail__current-unit">{cfg.unit}</span>
            <span className={`status-dot status-dot--${status}`} />
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        {[
          { label: 'Minimum', value: minVal },
          { label: 'Maximum', value: maxVal },
          { label: 'Average', value: avgVal },
          { label: 'Readings', value: readings.length },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <span className="stat-card__label">{s.label}</span>
            <span className="stat-card__value" style={{ color: cfg.color }}>
              {s.value}
              {typeof s.value === 'string' && s.value !== '—' && (
                <small> {cfg.unit}</small>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ── Threshold editor ── */}
      <div className="thresh-editor">
        <div className="thresh-editor__header">
          <span className="thresh-editor__title">Alert Thresholds</span>
          <span className="thresh-editor__hint">
            Values outside this range will trigger alerts
          </span>
        </div>
        <div className="thresh-editor__fields">
          <div className="thresh-editor__field">
            <label className="thresh-editor__label">Min</label>
            <div className="thresh-editor__input-wrap">
              <input
                type="number"
                className="thresh-input"
                value={editMin}
                onChange={e => setEditMin(e.target.value)}
                step="0.1"
              />
              <span className="thresh-editor__unit">{cfg.unit}</span>
            </div>
          </div>
          <span className="thresh-editor__sep">—</span>
          <div className="thresh-editor__field">
            <label className="thresh-editor__label">Max</label>
            <div className="thresh-editor__input-wrap">
              <input
                type="number"
                className="thresh-input"
                value={editMax}
                onChange={e => setEditMax(e.target.value)}
                step="0.1"
              />
              <span className="thresh-editor__unit">{cfg.unit}</span>
            </div>
          </div>
          <button
            className="apply-btn thresh-editor__save"
            onClick={handleSaveThresholds}
            style={{ borderColor: cfg.color, color: cfg.color, background: `${cfg.color}15` }}
          >
            {threshSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
        {threshError && <p className="range-error">{threshError}</p>}
      </div>

      {/* ── Time range selector ── */}
      <div className="range-selector">
        {TIME_RANGES.map((r, i) => (
          <button
            key={r.label}
            className={`range-btn${i === rangeIndex ? ' range-btn--active' : ''}`}
            onClick={() => setRangeIndex(i)}
            style={i === rangeIndex ? { borderColor: cfg.color, color: cfg.color } : {}}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ── Chart ── */}
      {loading ? (
        <div className="chart-loading">
          <div className="spinner" />
          Loading chart…
        </div>
      ) : (
        <div className="detail-chart">
          <div className="detail-chart__legend">
            <span className="ref-legend ref-legend--thresh">— Min / Max thresholds</span>
            <span className="ref-legend ref-legend--avg">— Average</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 16, bottom: 10, left: 0 }}>
              <defs>
                <linearGradient id={`detail-grad-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cfg.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={cfg.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252839" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#252839"
                tick={{ fill: '#8892a4', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#252839' }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#252839"
                tick={{ fill: '#8892a4', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
                tickFormatter={v => `${v}${cfg.unit}`}
                domain={(() => {
                  const allY = [...chartData.map(d => d.value), thresholds.min, thresholds.max];
                  const lo = Math.min(...allY);
                  const hi = Math.max(...allY);
                  const p  = (hi - lo) * 0.12 || 1;
                  return [lo - p, hi + p];
                })()}
              />
              <Tooltip content={<DetailTooltip unit={cfg.unit} color={cfg.color} />} />
              {/* threshold lines */}
              <ReferenceLine
                y={thresholds.min}
                stroke="#ef4444"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: `Min ${thresholds.min}${cfg.unit}`, position: 'insideBottomLeft', fill: '#ef4444', fontSize: 10 }}
              />
              <ReferenceLine
                y={thresholds.max}
                stroke="#ef4444"
                strokeDasharray="5 4"
                strokeWidth={1.5}
                label={{ value: `Max ${thresholds.max}${cfg.unit}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }}
              />
              {/* average line */}
              {avgVal !== '—' && (
                <ReferenceLine
                  y={parseFloat(avgVal)}
                  stroke="#94a3b8"
                  strokeDasharray="2 5"
                  strokeWidth={1.5}
                  label={{ value: `Avg ${avgVal}${cfg.unit}`, position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={cfg.color}
                strokeWidth={2}
                fill={`url(#detail-grad-${type})`}
                dot={false}
                activeDot={{ r: 4, fill: cfg.color, stroke: '#1a1d2e', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent readings table ── */}
      <div className="section">
        <h2 className="section-title">Recent Readings</h2>
        <div className="table-wrapper">
          <table className="readings-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...readings].reverse().slice(0, 25).map((r, i) => {
                const s = getSensorStatus(type, r.value);
                return (
                  <tr key={i}>
                    <td className="td-mono">{formatDateTime(r.recorded_at)}</td>
                    <td className="td-mono" style={{ color: cfg.color }}>
                      {parseFloat(r.value).toFixed(1)} {cfg.unit}
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
        </div>
      </div>
    </div>
  );
}
