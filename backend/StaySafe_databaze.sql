/*StaySafe – MySQL Database Schema*/


CREATE DATABASE IF NOT EXISTS staysafe
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE staysafe;


/*1. USERS*/


CREATE TABLE users (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)     NOT NULL UNIQUE,
    email         VARCHAR(100)    NOT NULL UNIQUE,
    password_hash VARCHAR(255)    NOT NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

/* 2. DEVICES*/

CREATE TABLE devices (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    user_id     INT UNSIGNED    NOT NULL,
    name        VARCHAR(100)    NOT NULL,                 
    location    VARCHAR(255)        NULL,                  
    is_active   TINYINT(1)      NOT NULL DEFAULT 1,
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_devices_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE
);


/*3. SENSOR_READINGS*/


CREATE TABLE sensor_readings (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    device_id     INT UNSIGNED    NOT NULL,
    sensor_type   ENUM('temperature', 'humidity', 'light') NOT NULL,
    value         DECIMAL(8,2)    NOT NULL,   -- °C / % 
    unit          VARCHAR(10)     NOT NULL,   -- "°C", "%"
    recorded_at   DATETIME        NOT NULL,   -- čas měření z Arduina
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_readings_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_device_type_time (device_id, sensor_type, recorded_at)
);


/*4. ALERTS*/


CREATE TABLE alerts (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    device_id     INT UNSIGNED    NOT NULL,
    sensor_type   ENUM('temperature', 'humidity', 'light') NOT NULL,
    message       VARCHAR(255)    NOT NULL,               
    triggered_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_read       TINYINT(1)      NOT NULL DEFAULT 0,      
    PRIMARY KEY (id),
    CONSTRAINT fk_alerts_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_alerts_device (device_id, triggered_at)
);


/*5. SENSOR_CONTROLS*/

CREATE TABLE sensor_controls (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    device_id     INT UNSIGNED    NOT NULL,
    user_id       INT UNSIGNED    NOT NULL,
    sensor_type   ENUM('temperature', 'humidity', 'light', 'all') NOT NULL,
    is_enabled    TINYINT(1)      NOT NULL DEFAULT 1,      
    changed_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_controls_device
        FOREIGN KEY (device_id) REFERENCES devices (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_controls_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_controls_device (device_id, sensor_type)
);
3