import {
  dbInsertReading,
  dbSelectReadingById,
  dbSelectReadings,
} from "../db.js";

const SENSOR_UNITS = {
  temperature: "°C",
  light: "lux",
};

const SORT_COLUMNS = {
  recordedAt: "recorded_at",
  createdAt: "created_at",
};

// Arduino sends { deviceId, temperature|light, timestamp }
export async function createReading(payload) {
  const { deviceId, timestamp, ...sensorFields } = payload;

  const sensorType = Object.keys(sensorFields).find((k) => k in SENSOR_UNITS);
  const value = sensorFields[sensorType];
  const unit = SENSOR_UNITS[sensorType];
  const recordedAt = new Date(timestamp);

  const insertId = await dbInsertReading(deviceId, sensorType, value, unit, recordedAt);
  return getReadingById(insertId);
}

export async function getReadingById(id) {
  const row = await dbSelectReadingById(id);
  return row ? mapReading(row) : null;
}

export async function listReadings(filters = {}) {
  const conditions = [];
  const values = [];
  const timeColumn = SORT_COLUMNS[filters.timeField] ?? SORT_COLUMNS.recordedAt;
  const sortColumn = SORT_COLUMNS[filters.sortBy] ?? SORT_COLUMNS.recordedAt;

  if (filters.deviceId) {
    conditions.push("device_id = ?");
    values.push(filters.deviceId);
  }

  if (filters.sensorType) {
    conditions.push("sensor_type = ?");
    values.push(filters.sensorType);
  } else if (Array.isArray(filters.sensorTypes) && filters.sensorTypes.length > 0) {
    const placeholders = filters.sensorTypes.map(() => "?").join(", ");
    conditions.push(`sensor_type IN (${placeholders})`);
    values.push(...filters.sensorTypes);
  }

  if (filters.from) {
    conditions.push(`${timeColumn} >= ?`);
    values.push(new Date(filters.from));
  }

  if (filters.to) {
    conditions.push(`${timeColumn} <= ?`);
    values.push(new Date(filters.to));
  }

  const rows = await dbSelectReadings(
    conditions,
    values,
    filters.limit ?? null,
    filters.offset ?? null,
    sortColumn,
  );
  return rows.map(mapReading);
}

function mapReading(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    sensorType: row.sensor_type,
    value: row.value,
    unit: row.unit,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  };
}
