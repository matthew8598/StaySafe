import { SENSOR_CONFIG, MOCK_USER } from "./shared.js";

const MOCK_DEVICE = {
  id: 1,
  user_id: 1,
  name: "Mock Device",
  location: "Testing",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

let _mockSensorEnabled = { temperature: true, humidity: true, light: true };
let _mockThresholds = {
  temperature: { min: null, max: null },
  humidity: { min: null, max: null },
  light: { min: null, max: null },
};
let _mockProtectionEnabled = true;
let _mockAlerts = [
  {
    id: 1,
    deviceId: 1,
    sensorType: "temperature",
    message: "temperature anomaly: 3 consecutive readings above maximum threshold (35). Latest value: 38.2.",
    triggeredAt: new Date(Date.now() - 80 * 60_000).toISOString(),
    isRead: false,
  },
  {
    id: 2,
    deviceId: 1,
    sensorType: "humidity",
    message: "humidity anomaly: 3 consecutive readings below minimum threshold (20). Latest value: 17.4.",
    triggeredAt: new Date(Date.now() - 35 * 60_000).toISOString(),
    isRead: false,
  },
  {
    id: 3,
    deviceId: 1,
    sensorType: "light",
    message: "light anomaly: 3 consecutive readings above maximum threshold (5). Latest value: 41.0.",
    triggeredAt: new Date(Date.now() - 6 * 60_000).toISOString(),
    isRead: true,
  },
];

// ─── Mock data generation ─────────────────────────────────────────────────────────────────

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

export async function getAllSensorReadings(limit = 150, deviceId = 1, offset = 0) {
  void deviceId;
  const types = ["temperature", "humidity", "light"];
  const all = [];
  for (const type of types) {
    all.push(...generateReadings(type, Math.ceil(limit / 3), 1));
  }
  const sorted = all.sort(
    (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
  );
  return sorted.slice(offset, offset + limit);
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

export async function getProtectionStatus() {
  return { isEnabled: _mockProtectionEnabled };
}

export async function toggleProtection(deviceId, isEnabled) {
  void deviceId;
  _mockProtectionEnabled = isEnabled;
  return { isEnabled };
}

export async function getSensorControls() {
  return [
    {
      sensorType: "all",
      isEnabled: _mockProtectionEnabled,
      thresholdMin: null,
      thresholdMax: null,
    },
    ...Object.entries(_mockSensorEnabled).map(([sensorType, isEnabled]) => ({
    sensorType,
    isEnabled,
    thresholdMin: _mockThresholds[sensorType]?.min ?? null,
    thresholdMax: _mockThresholds[sensorType]?.max ?? null,
    })),
  ];
}

export async function toggleSensorEnabled(sensorType, isEnabled) {
  _mockSensorEnabled[sensorType] = isEnabled;
  return {
    sensorType,
    isEnabled,
    thresholdMin: _mockThresholds[sensorType]?.min ?? null,
    thresholdMax: _mockThresholds[sensorType]?.max ?? null,
  };
}

export async function setSensorThresholds(sensorType, thresholdMin, thresholdMax) {
  _mockThresholds[sensorType] = {
    min: thresholdMin ?? null,
    max: thresholdMax ?? null,
  };

  return {
    sensorType,
    isEnabled: _mockSensorEnabled[sensorType],
    thresholdMin: _mockThresholds[sensorType].min,
    thresholdMax: _mockThresholds[sensorType].max,
  };
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export async function getAlerts(deviceId = 1, options = {}) {
  const fromMs = options.from ? new Date(options.from).getTime() : null;
  const toMs = options.to ? new Date(options.to).getTime() : null;

  let rows = _mockAlerts.filter((alert) => alert.deviceId === deviceId);

  if (options.sensorType) {
    rows = rows.filter((alert) => alert.sensorType === options.sensorType);
  }

  if (typeof options.isRead === "boolean") {
    rows = rows.filter((alert) => alert.isRead === options.isRead);
  }

  if (fromMs) {
    rows = rows.filter((alert) => new Date(alert.triggeredAt).getTime() >= fromMs);
  }

  if (toMs) {
    rows = rows.filter((alert) => new Date(alert.triggeredAt).getTime() <= toMs);
  }

  rows = [...rows].sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
  );

  if (options.limit) {
    rows = rows.slice(0, options.limit);
  }

  return rows;
}

export async function resolveAlert(alertId) {
  const id = Number(alertId);
  _mockAlerts = _mockAlerts.map((alert) => (
    alert.id === id ? { ...alert, isRead: true } : alert
  ));

  const updated = _mockAlerts.find((alert) => alert.id === id);
  if (!updated) throw new Error("Alert not found");
  return updated;
}

export async function getDevices() {
  return { total: 1, data: [MOCK_DEVICE] };
}

export async function createDevice(name = "My Device", location, selectedSensors) {
  const all = ["temperature", "humidity", "light"];
  _mockSensorEnabled = Object.fromEntries(
    all.map((s) => [s, !selectedSensors || selectedSensors.includes(s)]),
  );
  _mockThresholds = {
    temperature: { min: null, max: null },
    humidity: { min: null, max: null },
    light: { min: null, max: null },
  };
  _mockProtectionEnabled = true;
  _mockAlerts = [];
  return { ...MOCK_DEVICE, name, location: location ?? null };
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
  void _password;
  return {
    user: { id: 99, username, email },
    token: "mock-token",
  };
}
