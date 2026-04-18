import { SENSOR_CONFIG } from "./shared.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const DEFAULT_DEVICE_ID = Number(import.meta.env.VITE_DEFAULT_DEVICE_ID) || 1;

// Map camelCase backend response to snake_case shape used by all components
function mapReading(r) {
  return {
    id: r.id,
    device_id: r.deviceId,
    sensor_type: r.sensorType,
    value: parseFloat(r.value),
    unit: r.unit,
    recorded_at: r.recordedAt,
  };
}

async function fetchReadings(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/readings?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch readings: ${res.status}`);
  return res.json();
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function getRecentReadings(sensorType, count = 10) {
  const rows = await fetchReadings({
    deviceId: DEFAULT_DEVICE_ID,
    sensorType,
    limit: count,
  });
  // backend returns DESC; reverse to oldest-first for charts
  return rows.map(mapReading).reverse();
}

export async function getHistoryReadings(
  sensorType,
  intervalMinutes = 1,
  count = 60,
) {
  // Backend doesn't downsample; fetch count readings covering count*interval minutes
  const to = new Date();
  const from = new Date(to - count * intervalMinutes * 60_000);
  return getReadingsByDateRange(sensorType, from, to);
}

export async function getAllSensorReadings(limit = 150) {
  const rows = await fetchReadings({
    deviceId: DEFAULT_DEVICE_ID,
    limit,
  });
  return rows.map(mapReading);
}

export async function getReadingsByDateRange(sensorType, from, to) {
  const rows = await fetchReadings({
    deviceId: DEFAULT_DEVICE_ID,
    sensorType,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  });
  // already ordered DESC from backend; reverse to oldest-first for charts
  return rows.map(mapReading).reverse();
}

// ─── Protection — no backend endpoint yet, stub until devices route exists ────

export async function getProtectionStatus(_deviceId = 1) {
  return { is_enabled: true };
}

export async function toggleProtection(_deviceId = 1, isEnabled) {
  return { is_enabled: isEnabled };
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  return data;
}

export async function register(username, email, password) {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Registration failed");
  return { user: data, token: null };
}
