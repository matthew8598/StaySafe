/* StaySafe – PostgreSQL Database Schema */


/* ── ENUM TYPES ─────────────────────────────────────────────────────────── */

DO $$ BEGIN
    CREATE TYPE sensor_type_enum     AS ENUM ('temperature', 'humidity', 'light');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE sensor_type_all_enum AS ENUM ('temperature', 'humidity', 'light', 'all');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


/* ── TRIGGER HELPER (auto-update timestamp columns) ─────────────────────── */

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.changed_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


/* 1. USERS */

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL          NOT NULL,
    username      VARCHAR(50)     NOT NULL UNIQUE,
    email         VARCHAR(100)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


/* 2. DEVICES */

CREATE TABLE IF NOT EXISTS devices (
    id          SERIAL          NOT NULL,
    user_id     INTEGER         NOT NULL,
    name        VARCHAR(100)    NOT NULL,
    location    VARCHAR(255)    NULL,
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_devices_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE OR REPLACE TRIGGER trg_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


/* 3. SENSOR_READINGS */

CREATE TABLE IF NOT EXISTS sensor_readings (
    id            SERIAL              NOT NULL,
    device_id     INTEGER             NOT NULL,
    sensor_type   sensor_type_enum    NOT NULL,
    value         NUMERIC(8,2)        NOT NULL,   -- °C / %
    unit          VARCHAR(10)         NOT NULL,   -- '°C', '%'
    recorded_at   TIMESTAMP           NOT NULL,   -- time from Arduino
    created_at    TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_readings_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_device_type_time ON sensor_readings (device_id, sensor_type, recorded_at);


/* 4. ALERTS */

CREATE TABLE IF NOT EXISTS alerts (
    id            SERIAL              NOT NULL,
    device_id     INTEGER             NOT NULL,
    sensor_type   sensor_type_enum    NOT NULL,
    message       VARCHAR(255)        NOT NULL,
    triggered_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read       BOOLEAN             NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    CONSTRAINT fk_alerts_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts (device_id, triggered_at);


/* 5. SENSOR_CONTROLS */

CREATE TABLE IF NOT EXISTS sensor_controls (
    id             SERIAL                  NOT NULL,
    device_id      INTEGER                 NOT NULL,
    user_id        INTEGER                 NOT NULL,
    sensor_type    sensor_type_all_enum    NOT NULL,
    is_enabled     BOOLEAN                 NOT NULL DEFAULT TRUE,
    threshold_min  NUMERIC(8,2)            NULL DEFAULT NULL,
    threshold_max  NUMERIC(8,2)            NULL DEFAULT NULL,
    changed_at     TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_controls_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_controls_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT uq_controls_device_sensor UNIQUE (device_id, sensor_type)
);

CREATE INDEX IF NOT EXISTS idx_controls_device ON sensor_controls (device_id, sensor_type);

CREATE OR REPLACE TRIGGER trg_controls_changed_at
    BEFORE UPDATE ON sensor_controls
    FOR EACH ROW EXECUTE FUNCTION set_changed_at();