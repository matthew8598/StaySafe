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
  humidity: {
    label: "Humidity",
    unit: "%",
    color: "#38bdf8",
    okMin: 20,
    okMax: 65,
    base: 47,
    variance: 8,
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

// ─── Mock user (dev only) ─────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 1,
  username: "admin",
  email: "admin@staysafe.local",
  password: "staysafe123",
};

// ─── Threshold management (persisted to localStorage) ────────────────────────

const THRESH_KEY = "staysafe_thresholds";

function loadAllThresholds() {
  try {
    return JSON.parse(localStorage.getItem(THRESH_KEY)) || {};
  } catch {
    return {};
  }
}

export function getThresholds(type) {
  const stored = loadAllThresholds()[type];
  const cfg = SENSOR_CONFIG[type];
  return {
    min: stored?.min ?? cfg?.okMin ?? 0,
    max: stored?.max ?? cfg?.okMax ?? 100,
  };
}

export function setThresholds(type, min, max) {
  const all = loadAllThresholds();
  all[type] = { min: parseFloat(min), max: parseFloat(max) };
  localStorage.setItem(THRESH_KEY, JSON.stringify(all));
}

// ─── Status check (uses custom thresholds) ────────────────────────────────────

export function getSensorStatus(sensorType, value) {
  const { min, max } = getThresholds(sensorType);
  return value >= min && value <= max ? "ok" : "alert";
}
