import {
  dbSelectSensorControl,
  dbSelectSensorControls,
  dbUpsertSensorControl,
} from "../db.js";

function mapControl(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    userId: row.user_id,
    sensorType: row.sensor_type,
    isEnabled: row.is_enabled === 1,
    thresholdMin: row.threshold_min !== null ? parseFloat(row.threshold_min) : null,
    thresholdMax: row.threshold_max !== null ? parseFloat(row.threshold_max) : null,
    changedAt: row.changed_at,
  };
}

export async function getSensorControl(deviceId, sensorType) {
  const row = await dbSelectSensorControl(deviceId, sensorType);
  return row ? mapControl(row) : null;
}

export async function getAllSensorControls(deviceId) {
  const rows = await dbSelectSensorControls(deviceId);
  return rows.map(mapControl);
}

export async function upsertSensorControl(deviceId, userId, sensorType, isEnabled, thresholdMin, thresholdMax) {
  await dbUpsertSensorControl(deviceId, userId, sensorType, isEnabled, thresholdMin, thresholdMax);
  return getSensorControl(deviceId, sensorType);
}
