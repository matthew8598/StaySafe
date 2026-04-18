import {
  dbInsertAlert,
  dbSelectAlerts,
  dbSelectAlertById,
  dbDeleteAlert,
} from "../db.js";

export async function createAlert(alert) {
  const { deviceId, sensorType, message } = alert;
  const insertId = await dbInsertAlert(deviceId, sensorType, message);
  return getAlertById(insertId);
}

export async function listAlerts(filters = {}) {
  const conditions = [];
  const values = [];

  if (filters.deviceId) {
    conditions.push("device_id = ?");
    values.push(filters.deviceId);
  }

  if (filters.sensorType) {
    conditions.push("sensor_type = ?");
    values.push(filters.sensorType);
  }

  const rows = await dbSelectAlerts(conditions, values);
  return rows.map(mapAlert);
}

export async function getAlertById(id) {
  const row = await dbSelectAlertById(id);
  return row ? mapAlert(row) : null;
}

export async function removeAlert(id) {
  return dbDeleteAlert(id);
}

function mapAlert(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    sensorType: row.sensor_type,
    message: row.message,
    triggeredAt: row.triggered_at,
  };
}
