/* StaySafe – PostgreSQL Database Schema */

CREATE DATABASE staysafe;
\c staysafe

/* Create ENUM types for sensor_type */
CREATE TYPE sensor_type_enum AS ENUM ('temperature', 'humidity', 'light');
CREATE TYPE sensor_type_all_enum AS ENUM ('temperature', 'humidity', 'light', 'all');

/* 1. USERS */
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/* 2. DEVICES */
CREATE TABLE devices (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    location    VARCHAR(255),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/* 3. SENSOR_READINGS */
CREATE TABLE sensor_readings (
    id            SERIAL PRIMARY KEY,
    device_id     INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type   sensor_type_enum NOT NULL,
    value         DECIMAL(8,2) NOT NULL,
    unit          VARCHAR(10) NOT NULL,
    recorded_at   TIMESTAMP NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_type_time ON sensor_readings (device_id, sensor_type, recorded_at);

/* 4. ALERTS */
CREATE TABLE alerts (
    id            SERIAL PRIMARY KEY,
    device_id     INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    sensor_type   sensor_type_enum NOT NULL,
    message       VARCHAR(255) NOT NULL,
    triggered_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_alerts_device ON alerts (device_id, triggered_at);

/* 5. SENSOR_CONTROLS */
CREATE TABLE sensor_controls (
    id             SERIAL PRIMARY KEY,
    device_id      INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sensor_type    sensor_type_all_enum NOT NULL,
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    threshold_min  DECIMAL(8,2),
    threshold_max  DECIMAL(8,2),
    changed_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (device_id, sensor_type)
);

CREATE INDEX idx_controls_device ON sensor_controls (device_id, sensor_type);

/* Trigger to auto-update updated_at in users table */
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_users_timestamp();

/* Trigger to auto-update updated_at in devices table */
CREATE OR REPLACE FUNCTION update_devices_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER devices_update_timestamp
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_devices_timestamp();

/* Trigger to auto-update changed_at in sensor_controls table */
CREATE OR REPLACE FUNCTION update_sensor_controls_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sensor_controls_update_timestamp
BEFORE UPDATE ON sensor_controls
FOR EACH ROW
EXECUTE FUNCTION update_sensor_controls_timestamp();
