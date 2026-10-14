-- IoT Sensor Dashboard Relational Schema (SQLite & PostgreSQL Compatible)

-- Devices Table: Registered IoT nodes (ESP32, ESP8266, Arduino)
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(64) DEFAULT 'ESP32',
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    status VARCHAR(20) DEFAULT 'offline',
    device_token VARCHAR(256) NOT NULL,
    last_seen_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sensors Table: Sensor metadata & configuration
CREATE TABLE IF NOT EXISTS sensors (
    id VARCHAR(64) PRIMARY KEY,
    device_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(64) NOT NULL,        -- 'temperature', 'humidity', 'pressure', etc.
    unit VARCHAR(16) NOT NULL,        -- '°C', '%', 'hPa', 'g', 'V'
    min_threshold REAL,               -- Low alert trigger
    max_threshold REAL,               -- High alert trigger
    is_demo BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'nominal', -- 'nominal', 'critical_high', 'critical_low', 'offline'
    last_value REAL,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Sensor Readings Table: High-frequency time-series telemetry
CREATE TABLE IF NOT EXISTS sensor_readings (
    id VARCHAR(64) PRIMARY KEY,
    sensor_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    sensor_type VARCHAR(64) NOT NULL,
    value REAL NOT NULL,
    unit VARCHAR(16),
    is_demo BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
);

-- Performance Indexes for Time-Series Queries
CREATE INDEX IF NOT EXISTS idx_readings_sensor_timestamp ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_readings_is_demo ON sensor_readings (is_demo);
CREATE INDEX IF NOT EXISTS idx_sensors_device_id ON sensors (device_id);

-- Alerts Table: Threshold violations and system incidents
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    sensor_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64),
    alert_type VARCHAR(32) NOT NULL,  -- 'critical_high', 'critical_low'
    threshold REAL NOT NULL,
    value REAL NOT NULL,
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

