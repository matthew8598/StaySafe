import {
  dbInsertAlert,
  dbSelectAlerts,
  dbSelectAlertById,
  dbDeleteAlert,
  dbMarkAlertAsRead,
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

  if (typeof filters.isRead === "boolean") {
    conditions.push("is_read = ?");
    values.push(filters.isRead);
  }

  if (filters.from) {
    conditions.push("triggered_at >= ?");
    values.push(new Date(filters.from));
  }

  if (filters.to) {
    conditions.push("triggered_at <= ?");
    values.push(new Date(filters.to));
  }

  const rows = await dbSelectAlerts(conditions, values, filters.limit ?? null);
  return rows.map(mapAlert);
}

export async function getAlertById(id) {
  const row = await dbSelectAlertById(id);
  return row ? mapAlert(row) : null;
}

export async function removeAlert(id) {
  return dbDeleteAlert(id);
}

export async function resolveAlert(id) {
  const updated = await dbMarkAlertAsRead(id);
  if (!updated) return null;
  return getAlertById(id);
}

function mapAlert(row) {
  return {
    id: row.id,
    deviceId: row.device_id,
    sensorType: row.sensor_type,
    message: row.message,
    triggeredAt: row.triggered_at,
    isRead: row.is_read,
  };
}
