import { SENSOR_CONFIG, MOCK_USER } from "./shared.js";

// ─── Mock data generation ─────────────────────────────────────────────────────

function generateReadings(sensorType, count, intervalMinutes = 1) {
  const cfg = SENSOR_CONFIG[sensorType];
  const now = Date.now();
  const readings = [];
  let v = cfg.base;

  for (let i = count; i >= 1; i--) {
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
      id: count - i + 1,
      sensorType,
      value: v,
      unit: cfg.unit,
      recordedAt: new Date(now - i * intervalMinutes * 60_000).toISOString(),
    });
  }
  return readings;
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function getRecentReadings(sensorType, count = 10) {
  return generateReadings(sensorType, count, 1);
}

export async function getHistoryReadings(
  sensorType,
  intervalMinutes = 1,
  count = 60,
) {
  return generateReadings(sensorType, count, intervalMinutes);
}

export async function getAllSensorReadings(limit = 150) {
  const types = ["temperature", "humidity", "light"];
  const all = [];
  for (const type of types) {
    all.push(...generateReadings(type, Math.ceil(limit / 3), 1));
  }
  return all.sort(
    (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
  );
}

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
      sensorType,
      value: v,
      unit: cfg.unit,
      recordedAt: new Date(t).toISOString(),
    });
    t += intervalMinutes * 60_000;
  }
  return readings;
}

export async function getProtectionStatus(_deviceId = 1) {
  return { isEnabled: true };
}

export async function toggleProtection(_deviceId = 1, isEnabled) {
  return { isEnabled: isEnabled };
}

const _mockSensorEnabled = { temperature: true, humidity: true, light: true };

export async function getSensorControls(_deviceId = 1) {
  return Object.entries(_mockSensorEnabled).map(([sensorType, isEnabled]) => ({
    sensorType,
    isEnabled,
    thresholdMin: null,
    thresholdMax: null,
  }));
}

export async function toggleSensorEnabled(sensorType, isEnabled) {
  _mockSensorEnabled[sensorType] = isEnabled;
  return { sensorType, isEnabled };
}

export async function login(email, password) {
  if (email === MOCK_USER.email && password === MOCK_USER.password) {
    return {
      user: { id: MOCK_USER.id, username: MOCK_USER.username, email: MOCK_USER.email },
      token: "mock-token",
    };
  }
  throw new Error("Invalid credentials");
}

export async function register(username, email, _password) {
  return {
    user: { id: 99, username, email },
    token: "mock-token",
  };
}
