// ─── Sensor configuration ─────────────────────────────────────────────────────

export const SENSOR_CONFIG = {
  temperature: {
    label: "Temperature",
    unit: "°C",
    color: "#f97316",
    okMin: 10,
    okMax: 35,
    base: 22.5,
    variance: 2.5,
  },
  light: {
    label: "Light",
    unit: "lux",
    color: "#fbbf24",
    okMin: 0,
    okMax: 5,
    base: 0,
    variance: 0,
  },
};

export const SUPPORTED_SENSOR_TYPES = Object.keys(SENSOR_CONFIG);

export function isSupportedSensorType(sensorType) {
  return SUPPORTED_SENSOR_TYPES.includes(sensorType);
}

// ─── Mock user (dev only) ─────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 2,
  username: "admin",
  email: "admin@staysafe.local",
  password: "staysafe123",
};

// ─── Threshold management (persisted to localStorage) ────────────────────────

const THRESH_KEY = "staysafe_thresholds_v2";

function getThresholdScopeKey(scopeKey) {
  return scopeKey == null ? "global" : String(scopeKey);
}

function loadAllThresholds() {
  try {
    return JSON.parse(localStorage.getItem(THRESH_KEY)) || {};
  } catch {
    return {};
  }
}

function getScopedThresholds(scopeKey) {
  const all = loadAllThresholds();
  return all[getThresholdScopeKey(scopeKey)] || {};
}

export function getThresholds(type, scopeKey) {
  const stored = getScopedThresholds(scopeKey)[type];
  const cfg = SENSOR_CONFIG[type];
  return {
    min: stored?.min ?? cfg?.okMin ?? 0,
    max: stored?.max ?? cfg?.okMax ?? 100,
  };
}

export function setThresholds(type, min, max, scopeKey) {
  const all = loadAllThresholds();
  const resolvedScopeKey = getThresholdScopeKey(scopeKey);
  const scoped = all[resolvedScopeKey] || {};
  scoped[type] = { min: parseFloat(min), max: parseFloat(max) };
  all[resolvedScopeKey] = scoped;
  localStorage.setItem(THRESH_KEY, JSON.stringify(all));
}

// ─── Status check (uses custom thresholds) ────────────────────────────────────

export function getSensorStatus(sensorType, value, scopeKey) {
  const { min, max } = getThresholds(sensorType, scopeKey);
  return value >= min && value <= max ? "ok" : "alert";
}
