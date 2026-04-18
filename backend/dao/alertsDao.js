import db from "../db.js";

export async function createAlert(alert) {
  const { deviceId, sensorType, message } = alert;

  const [result] = await db.execute(
    `
    INSERT INTO alerts (device_id, sensor_type, message)
    VALUES (?, ?, ?)
    `,
    [deviceId, sensorType, message],
  );

  return getAlertById(result.insertId);
}

/* createAlert({
  deviceId: 1,
  sensorType: "temperature",
  message: "Temperature is outside allowed range",
}); */

export async function listAlerts(filters = {}) {
  let sql = `
    SELECT id, device_id, sensor_type, message, triggered_at
    FROM alerts
  `;

  const conditions = [];
  const values = [];

  //List by ID
  if (filters.deviceId) {
    conditions.push("device_id = ?");
    values.push(filters.deviceId);
  }

  // List by sensor_type
  if (filters.sensorType) {
    conditions.push("sensor_type = ?");
    values.push(filters.sensorType);
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY triggered_at DESC";

  const [rows] = await db.execute(sql, values);

  return rows.map(mapAlert);
}

export async function getAlertById(id) {
  const [rows] = await db.execute(
    `
    SELECT id, device_id, sensor_type, message, triggered_at
    FROM alerts
    WHERE id = ?
    `,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapAlert(rows[0]);
}

export async function removeAlert(id) {
  const [result] = await db.execute(
    `
    DELETE FROM alerts
    WHERE id = ?
    `,
    [id],
  );

  return result.affectedRows > 0;
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
