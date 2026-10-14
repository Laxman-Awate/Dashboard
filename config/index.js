/**
 * Application Configuration
 * Loads environment variables from .env if present, or falls back to robust defaults.
 */
require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  host: process.env.HOST || '0.0.0.0',
  deviceSecretToken: process.env.DEVICE_SECRET_TOKEN || 'iot-device-secure-token-2026',
  demoMode: process.env.DEMO_MODE !== 'false', // Default to true for instant out-of-the-box preview
  demoIntervalMs: parseInt(process.env.DEMO_INTERVAL_MS, 10) || 2500,
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'iot_sensors.db'),
  sensorTimeoutMs: parseInt(process.env.SENSOR_TIMEOUT_MS, 10) || 30000 // 30s timeout for offline detection
};

