import pg from "pg";
import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: envFile });
dotenv.config({ path: '.env' });

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Convert ?-style placeholders to PostgreSQL $n positional params
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// ── SENSOR READINGS ───────────────────────────────────────────────────────────

export async function dbInsertReading(deviceId, sensorType, value, unit, recordedAt) {
  const result = await pool.query(
    `INSERT INTO sensor_readings (device_id, sensor_type, value, unit, recorded_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [deviceId, sensorType, value, unit, recordedAt],
  );
  return result.rows[0].id;
}

export async function dbSelectReadingById(id) {
  const result = await pool.query(
    `SELECT id, device_id, sensor_type, value, unit, recorded_at, created_at FROM sensor_readings WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function dbSelectReadings(conditions = [], values = [], limit = null, offset = null) {
  let sql = `SELECT id, device_id, sensor_type, value, unit, recorded_at, created_at FROM sensor_readings`;
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY recorded_at DESC";
  if (limit !== null) {
    sql += ` LIMIT ${parseInt(limit, 10)}`;
  }
  if (offset !== null) {
    sql += ` OFFSET ${parseInt(offset, 10)}`;
  }
  const result = await pool.query(toPositional(sql), values);
  return result.rows;
}

// ── ALERTS ───────────────────────────────────────────────────────────────────

export async function dbInsertAlert(deviceId, sensorType, message) {
  const result = await pool.query(
    `INSERT INTO alerts (device_id, sensor_type, message) VALUES ($1, $2, $3) RETURNING id`,
    [deviceId, sensorType, message],
  );
  return result.rows[0].id;
}

export async function dbSelectAlerts(conditions = [], values = [], limit = null) {
  let sql = `SELECT id, device_id, sensor_type, message, triggered_at, is_read FROM alerts`;
  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY triggered_at DESC";
  if (limit !== null) {
    sql += ` LIMIT ${parseInt(limit, 10)}`;
  }
  const result = await pool.query(toPositional(sql), values);
  return result.rows;
}

export async function dbSelectAlertById(id) {
  const result = await pool.query(
    `SELECT id, device_id, sensor_type, message, triggered_at, is_read FROM alerts WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function dbMarkAlertAsRead(id) {
  const result = await pool.query(
    `UPDATE alerts SET is_read = TRUE WHERE id = $1`,
    [id],
  );
  return result.rowCount > 0;
}

export async function dbDeleteAlert(id) {
  const result = await pool.query(
    `DELETE FROM alerts WHERE id = $1`,
    [id],
  );
  return result.rowCount > 0;
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function dbInsertUser(username, email, passwordHash) {
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id`,
    [username, email, passwordHash],
  );
  return result.rows[0].id;
}

export async function dbSelectAllUsers() {
  const result = await pool.query(
    `SELECT id, username, email, created_at, updated_at FROM users`,
  );
  return result.rows;
}

export async function dbSelectUserById(id) {
  const result = await pool.query(
    `SELECT id, username, email FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function dbSelectUserByEmail(email) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email],
  );
  return result.rows[0] ?? null;
}

export async function dbSelectUserByUsername(username) {
  const result = await pool.query(
    `SELECT * FROM users WHERE username = $1 LIMIT 1`,
    [username],
  );
  return result.rows[0] ?? null;
}

export async function dbUpdateUser(id, username, email) {
  const result = await pool.query(
    `UPDATE users SET username = $1, email = $2 WHERE id = $3`,
    [username, email, id],
  );
  return result.rowCount > 0;
}

export async function dbUpdateUserPassword(id, passwordHash) {
  const result = await pool.query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, id],
  );
  return result.rowCount > 0;
}

export async function dbDeleteUser(id) {
  const result = await pool.query(
    `DELETE FROM users WHERE id = $1`,
    [id],
  );
  return result.rowCount > 0;
}

// ── SENSOR CONTROLS ───────────────────────────────────────────────────────────

export async function dbSelectSensorControl(deviceId, sensorType) {
  const result = await pool.query(
    `SELECT id, device_id, user_id, sensor_type, is_enabled, threshold_min, threshold_max, changed_at
     FROM sensor_controls WHERE device_id = $1 AND sensor_type = $2 LIMIT 1`,
    [deviceId, sensorType],
  );
  return result.rows[0] ?? null;
}

export async function dbSelectSensorControls(deviceId) {
  const result = await pool.query(
    `SELECT id, device_id, user_id, sensor_type, is_enabled, threshold_min, threshold_max, changed_at
     FROM sensor_controls WHERE device_id = $1`,
    [deviceId],
  );
  return result.rows;
}

export async function dbUpsertSensorControl(deviceId, userId, sensorType, isEnabled, thresholdMin, thresholdMax) {
  const result = await pool.query(
    `INSERT INTO sensor_controls (device_id, user_id, sensor_type, is_enabled, threshold_min, threshold_max)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (device_id, sensor_type) DO UPDATE SET
       is_enabled    = EXCLUDED.is_enabled,
       threshold_min = EXCLUDED.threshold_min,
       threshold_max = EXCLUDED.threshold_max,
       user_id       = EXCLUDED.user_id`,
    [deviceId, userId, sensorType, isEnabled, thresholdMin ?? null, thresholdMax ?? null],
  );
  return result;
}

//devices
 
export async function dbInsertDevice(userId, name, location) {
  const result = await pool.query(
    `INSERT INTO devices (user_id, name, location, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING id`,
    [userId, name, location ?? null],
  );
  return result.rows[0].id;
}
 
export async function dbSelectAllDevices() {
  const result = await pool.query(
    `SELECT id, user_id, name, location, is_active, created_at, updated_at FROM devices
     ORDER BY created_at DESC`,
  );
  return result.rows;
}
 
export async function dbSelectDevicesByUserId(userId) {
  const result = await pool.query(
    `SELECT id, user_id, name, location, is_active, created_at, updated_at FROM devices
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}
 
export async function dbSelectDeviceById(id) {
  const result = await pool.query(
    `SELECT id, user_id, name, location, is_active, created_at, updated_at FROM devices
     WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}
 
export async function dbUpdateDevice(id, name, location, isActive) {
  const result = await pool.query(
    `UPDATE devices
     SET name = $1, location = $2, is_active = $3, updated_at = NOW()
     WHERE id = $4`,
    [name, location ?? null, isActive, id],
  );
  return result.rowCount > 0;
}
 
export async function dbDeleteDevice(id) {
  const result = await pool.query(
    `DELETE FROM devices WHERE id = $1`,
    [id],
  );
  return result.rowCount > 0;
}
 
export default pool;
