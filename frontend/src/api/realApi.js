const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const DEFAULT_DEVICE_ID = Number(import.meta.env.VITE_DEFAULT_DEVICE_ID) || 1;

/** Read the JWT from the same sessionStorage key AuthContext uses. */
function getToken() {
  try {
    const raw = sessionStorage.getItem("staysafe_auth");
    return raw ? JSON.parse(raw)?.token : null;
  } catch {
    return null;
  }
}

/** Returns headers with Authorization when a token is present. */
function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...extra,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchReadings(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/readings?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch readings: ${res.status}`);
  return res.json();
}

// ─── Public API functions ─────────────────────────────────────────────────────

export async function getRecentReadings(sensorType, count = 10, deviceId = DEFAULT_DEVICE_ID) {
  const rows = await fetchReadings({
    deviceId,
    sensorType,
    limit: count,
  });
  // backend returns DESC; reverse to oldest-first for charts
  return rows.map(r => ({ ...r, value: parseFloat(r.value) })).reverse();
}

export async function getHistoryReadings(
  sensorType,
  intervalMinutes = 1,
  count = 60,
  deviceId = DEFAULT_DEVICE_ID,
) {
  // Backend doesn't downsample; fetch count readings covering count*interval minutes
  const to = new Date();
  const from = new Date(to - count * intervalMinutes * 60_000);
  return getReadingsByDateRange(sensorType, from, to, deviceId);
}

export async function getAllSensorReadings(limit = 150, deviceId = DEFAULT_DEVICE_ID, offset = 0) {
  const rows = await fetchReadings({
    deviceId,
    limit,
    offset,
  });
  return rows.map(r => ({ ...r, value: parseFloat(r.value) }));
}

export async function getReadingsByDateRange(sensorType, from, to, deviceId = DEFAULT_DEVICE_ID) {
  const rows = await fetchReadings({
    deviceId,
    sensorType,
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
  });
  // already ordered DESC from backend; reverse to oldest-first for charts
  return rows.map(r => ({ ...r, value: parseFloat(r.value) })).reverse();
}

// ─── Protection (derived from per-sensor controls) ──────────────────────────

export async function getProtectionStatus(deviceId = DEFAULT_DEVICE_ID) {
  const controls = await getSensorControls(deviceId);
  const globalControl = controls.find((control) => control.sensorType === "all");
  return {
    isEnabled: globalControl?.isEnabled ?? true,
  };
}

export async function toggleProtection(deviceId = DEFAULT_DEVICE_ID, isEnabled) {
  const updated = await updateSensorControl("all", { isEnabled }, deviceId);
  return { isEnabled: updated?.isEnabled ?? isEnabled };
}

// ─── Sensor controls ─────────────────────────────────────────────────────────

export async function getSensorControls(deviceId = DEFAULT_DEVICE_ID) {
  const res = await fetch(`${BASE_URL}/controls?deviceId=${deviceId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch controls: ${res.status}`);
  return res.json();
}

export async function updateSensorControl(sensorType, updates, deviceId = DEFAULT_DEVICE_ID) {
  const res = await fetch(`${BASE_URL}/controls/${deviceId}/${sensorType}`, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`Failed to update control: ${res.status}`);
  return res.json();
}

export async function toggleSensorEnabled(sensorType, isEnabled, deviceId = DEFAULT_DEVICE_ID) {
  return updateSensorControl(sensorType, { isEnabled }, deviceId);
}

export async function setSensorThresholds(
  sensorType,
  thresholdMin,
  thresholdMax,
  deviceId = DEFAULT_DEVICE_ID,
) {
  return updateSensorControl(sensorType, { thresholdMin, thresholdMax }, deviceId);
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export async function getAlerts(deviceId = DEFAULT_DEVICE_ID, options = {}) {
  const params = new URLSearchParams({ deviceId: String(deviceId) });
  if (options.sensorType) params.set("sensorType", options.sensorType);
  if (typeof options.isRead === "boolean") params.set("isRead", String(options.isRead));
  if (options.from) params.set("from", new Date(options.from).toISOString());
  if (options.to) params.set("to", new Date(options.to).toISOString());
  if (options.limit) params.set("limit", String(options.limit));

  const res = await fetch(`${BASE_URL}/alerts?${params.toString()}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to fetch alerts: ${res.status}`);
  return res.json();
}

export async function resolveAlert(alertId) {
  const res = await fetch(`${BASE_URL}/alerts/${alertId}/resolve`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to resolve alert: ${res.status}`);
  return res.json();
}

// ─── Devices ─────────────────────────────────────────────────────────────────

export async function getDevices() {
  const res = await fetch(`${BASE_URL}/devices`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch devices: ${res.status}`);
  return res.json(); // { total, data }
}

export async function createDevice(name, location, selectedSensors) {
  const res = await fetch(`${BASE_URL}/devices`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ name, location, selectedSensors }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create device");
  return data;
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
