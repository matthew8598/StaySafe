// API service — swap mock implementations for real fetch calls once backend is ready
const BASE_URL = "http://localhost:3000/api";

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

// ─── Mock data generation ─────────────────────────────────────────────────────

function generateReadings(sensorType, count, intervalMinutes = 1) {
  const cfg = SENSOR_CONFIG[sensorType];
  const now = Date.now();
  const readings = [];
  let v = cfg.base;

  for (let i = count; i >= 1; i--) {
    if (sensorType === "light") {
      // Light: mostly 0 (safe is closed), occasional spike simulates intrusion
      v =
        Math.random() < 0.06
          ? parseFloat((Math.random() * 90 + 8).toFixed(1))
          : 0;
    } else {
      // Smooth random walk within base ± variance
      v += (Math.random() - 0.5) * cfg.variance * 0.25;
      v = parseFloat(
        Math.max(
          cfg.base - cfg.variance,
          Math.min(cfg.base + cfg.variance, v),
        ).toFixed(1),
      );
    }
    readings.push({
      id: count - i + 1,
      sensor_type: sensorType,
      value: v,
      unit: cfg.unit,
      recorded_at: new Date(now - i * intervalMinutes * 60_000).toISOString(),
    });
  }
  return readings;
}

// ─── Public API functions ─────────────────────────────────────────────────────

/**
 * Get the most recent `count` readings for a single sensor type (1 per minute).
 * TODO: replace body with -> const r = await fetch(`${BASE_URL}/readings?sensor_type=${sensorType}&limit=${count}`); return (await r.json()).reverse();
 */
export async function getRecentReadings(sensorType, count = 10) {
  return generateReadings(sensorType, count, 1);
}

/**
 * Get historical readings for the detail / chart page.
 * TODO: replace body with real API call
 */
export async function getHistoryReadings(
  sensorType,
  intervalMinutes = 1,
  count = 60,
) {
  return generateReadings(sensorType, count, intervalMinutes);
}

/**
 * Get a mixed list of all sensor readings for the history table.
 * TODO: real API
 */
export async function getAllSensorReadings(limit = 150) {
  const types = ["temperature", "humidity", "light"];
  const all = [];
  for (const type of types) {
    all.push(...generateReadings(type, Math.ceil(limit / 3), 1));
  }
  return all.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at));
}

/**
 * Get readings for a specific sensor between two Date/ISO timestamps.
 * Automatically picks a sensible interval based on the span.
 * TODO: replace body with -> const r = await fetch(`${BASE_URL}/readings?sensor_type=${sensorType}&from=${from.toISOString()}&to=${to.toISOString()}`); return await r.json();
 */
export async function getReadingsByDateRange(sensorType, from, to) {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  if (fromMs >= toMs) return [];

  const diffMin = (toMs - fromMs) / 60_000;
  let intervalMinutes;
  if (diffMin <= 120) intervalMinutes = 1;
  else if (diffMin <= 720) intervalMinutes = 5;
  else if (diffMin <= 2880) intervalMinutes = 15;
  else if (diffMin <= 20160) intervalMinutes = 60;
  else intervalMinutes = 360;

  const cfg = SENSOR_CONFIG[sensorType];
  const readings = [];
  let v = cfg.base;
  let t = fromMs;

  while (t <= toMs) {
    if (sensorType === "light") {
      v =
        Math.random() < 0.06
          ? parseFloat((Math.random() * 90 + 8).toFixed(1))
          : 0;
    } else {
      v += (Math.random() - 0.5) * cfg.variance * 0.25;
      v = parseFloat(
        Math.max(
          cfg.base - cfg.variance,
          Math.min(cfg.base + cfg.variance, v),
        ).toFixed(1),
      );
    }
    readings.push({
      sensor_type: sensorType,
      value: v,
      unit: cfg.unit,
      recorded_at: new Date(t).toISOString(),
    });
    t += intervalMinutes * 60_000;
  }
  return readings;
}

/**
 * Get current protection (monitoring) state for the device.
 * TODO: const r = await fetch(`${BASE_URL}/devices/${deviceId}/protection`); return r.json();
 */
export async function getProtectionStatus(deviceId = 1) {
  return { is_enabled: true };
}

/**
 * Enable or disable protection (monitoring) for the device.
 * TODO: real API
 */
export async function toggleProtection(deviceId = 1, isEnabled) {
  // await fetch(`${BASE_URL}/devices/${deviceId}/protection`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ is_enabled: isEnabled }),
  // });
  return { is_enabled: isEnabled };
}

// ─── Auth (mock) ─────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 1,
  username: "admin",
  email: "admin@staysafe.local",
  password: "staysafe123",
};

/**
 * Log in with email + password.
 * TODO: replace with -> const r = await fetch(`${BASE_URL}/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password}) }); if (!r.ok) throw new Error('Invalid credentials'); return r.json();
 */
//LOGIN
export async function login(email, password) {
  const response = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}
/**
 * Register a new account.
 * TODO: replace with real fetch to POST /auth/register
 */
// REGISTER
export async function register(username, email, password) {
  const response = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username,
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed");
  }

  return {
    user: data,
    token: null,
  };
}
