import { SENSOR_CONFIG, getThresholds } from '../api/api';
import MiniChart from './MiniChart';

const SENSOR_ICONS = {
  temperature: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  ),
  humidity: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  light: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export default function SensorCard({ type, data, enabled = true, onToggleEnabled, onClick }) {
  const cfg = SENSOR_CONFIG[type];
  const { readings, current, status } = data;
  const isOk = status === 'ok';

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  }

  function handleToggle(e) {
    e.stopPropagation();
    onToggleEnabled?.(!enabled);
  }

  return (
    <div
      className={`sensor-card sensor-card--${status}${!enabled ? ' sensor-card--disabled' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${cfg.label} sensor detail`}
    >
      <div className="sensor-card__header">
        <div className="sensor-card__icon" style={{ color: cfg.color, background: `${cfg.color}1a` }}>
          {SENSOR_ICONS[type]}
        </div>
        <span className="sensor-card__name">{cfg.label}</span>
        <button
          className={`toggle toggle--sm ${enabled ? 'toggle--on' : 'toggle--off'}`}
          onClick={handleToggle}
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? `Disable ${cfg.label} sensor` : `Enable ${cfg.label} sensor`}
          title={enabled ? 'Sensor enabled' : 'Sensor disabled'}
        >
          <span className="toggle__thumb" />
        </button>
        <span
          className={`status-dot status-dot--${status}`}
          title={isOk ? 'Normal' : 'Alert'}
        />
      </div>

      <div className="sensor-card__value">
        {current !== null ? (
          <>
            <span className="sensor-card__number">
              {typeof current === 'number' ? current.toFixed(1) : current}
            </span>
            <span className="sensor-card__unit">{cfg.unit}</span>
          </>
        ) : (
          <span className="sensor-card__number sensor-card__number--na">—</span>
        )}
      </div>

      <div className={`sensor-card__badge sensor-card__badge--${status}`}>
        <span className="sensor-card__badge-dot" />
        {isOk ? 'Normal' : 'Alert'}
      </div>

      <div className="sensor-card__chart-label">Last 10 minutes</div>
      <div className="sensor-card__chart">
        <MiniChart
          data={readings}
          color={cfg.color}
          unit={cfg.unit}
          gradId={`mini-${type}`}
          thresholds={getThresholds(type)}
        />
      </div>

      <div className="sensor-card__hint">View details →</div>
    </div>
  );
}
