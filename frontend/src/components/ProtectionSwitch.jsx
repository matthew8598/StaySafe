function ShieldIcon({ enabled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      {!enabled && <line x1="4" y1="4" x2="20" y2="20" />}
    </svg>
  );
}

export default function ProtectionSwitch({ enabled, onToggle }) {
  return (
    <div className={`protection-switch protection-switch--${enabled ? 'on' : 'off'}`}>
      <div className="protection-switch__icon">
        <ShieldIcon enabled={enabled} />
      </div>
      <div className="protection-switch__info">
        <span className="protection-switch__label">Safe Protection</span>
        <span className="protection-switch__sublabel">
          {enabled
            ? 'Active — all sensors monitoring'
            : 'Disabled — safe is unprotected'}
        </span>
      </div>
      <button
        className={`toggle ${enabled ? 'toggle--on' : 'toggle--off'}`}
        onClick={() => onToggle(!enabled)}
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'Disable protection' : 'Enable protection'}
      >
        <span className="toggle__thumb" />
      </button>
    </div>
  );
}
