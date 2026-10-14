/**
 * Sensor Ingestion and Management Service
 * Handles data validation, sanitization, auto-registration,
 * threshold evaluation, and live WebSocket streaming.
 */
const db = require('../db/database');
const wsService = require('./websocketService');
const alertService = require('./alertService');
const config = require('../config');

class SensorService {
  constructor() {
    this.startHealthCheckLoop();
  }

  /**
   * Validate incoming reading payload
   */
  validatePayload(payload) {
    const errors = [];

    if (!payload.sensorId || typeof payload.sensorId !== 'string') {
      errors.push('Field "sensorId" is required and must be a string.');
    }

    if (payload.value === undefined || payload.value === null || payload.value === '') {
      errors.push('Field "value" is required.');
    } else {
      const numVal = Number(payload.value);
      if (isNaN(numVal) || !isFinite(numVal)) {
        errors.push('Field "value" must be a valid finite number.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process a single sensor reading
   * @param {object} rawPayload - Incoming telemetry payload
   * @param {boolean} isDemo - Flag indicating whether data is simulated
   * @param {string} clientIp - Client IP for device tracking
   */
  processReading(rawPayload, isDemo = false, clientIp = null) {
    const validation = this.validatePayload(rawPayload);
    if (!validation.isValid) {
      throw { status: 400, message: 'Invalid sensor payload', errors: validation.errors };
    }

    const sensorId = rawPayload.sensorId.trim();
    const deviceId = (rawPayload.deviceId || 'esp32-default-node').trim();
    const sensorType = (rawPayload.sensorType || 'generic').toLowerCase();
    const unit = rawPayload.unit || '';
    const numericValue = parseFloat(Number(rawPayload.value).toFixed(2));
    const timestamp = rawPayload.timestamp ? new Date(rawPayload.timestamp).toISOString() : new Date().toISOString();

    // Auto-register device if not known
    db.registerOrUpdateDevice({
      id: deviceId,
      name: rawPayload.deviceName || `Device ${deviceId}`,
      type: rawPayload.deviceType || 'ESP32/Arduino',
      ipAddress: clientIp || '127.0.0.1',
      status: 'online'
    });

    // Auto-register sensor if not known
    let sensor = db.getSensorById(sensorId);
    if (!sensor) {
      sensor = db.registerOrUpdateSensor({
        id: sensorId,
        deviceId: deviceId,
        name: rawPayload.sensorName || `${sensorType.charAt(0).toUpperCase() + sensorType.slice(1)} Sensor (${sensorId})`,
        type: sensorType,
        unit: unit,
        minThreshold: rawPayload.minThreshold !== undefined ? Number(rawPayload.minThreshold) : null,
        maxThreshold: rawPayload.maxThreshold !== undefined ? Number(rawPayload.maxThreshold) : null
      });
    }

    // Persist reading
    const storedReading = db.addReading({
      sensorId,
      deviceId,
      sensorType,
      value: numericValue,
      unit: unit || sensor.unit,
      isDemo: Boolean(isDemo),
      timestamp
    });

    // Check thresholds & trigger alerts
    const alert = alertService.checkThresholds(sensor, storedReading);

    // Refresh updated sensor object
    const updatedSensor = db.getSensorById(sensorId);

    // Broadcast reading via WebSockets
    wsService.broadcast('sensor_reading', {
      reading: storedReading,
      sensor: updatedSensor,
      alert: alert || null,
      isDemo: Boolean(isDemo)
    });

    return {
      success: true,
      reading: storedReading,
      sensor: updatedSensor,
      alert: alert || null
    };
  }

  /**
   * Process multiple readings in a single batch
   */
  processBatchReadings(readings, isDemo = false, clientIp = null) {
    if (!Array.isArray(readings)) {
      throw { status: 400, message: 'Payload must be an array of sensor readings.' };
    }

    const results = [];
    const errors = [];

    readings.forEach((item, index) => {
      try {
        const res = this.processReading(item, isDemo, clientIp);
        results.push(res);
      } catch (err) {
        errors.push({ index, error: err.message || err });
      }
    });

    return {
      processedCount: results.length,
      errorsCount: errors.length,
      results,
      errors
    };
  }

  /**
   * Periodic health loop to mark sensors and devices as offline when timeout occurs
   */
  startHealthCheckLoop() {
    setInterval(() => {
      const now = Date.now();
      const sensors = db.getAllSensors();
      let statusChanged = false;

      sensors.forEach(s => {
        const lastUpdated = s.lastUpdated ? new Date(s.lastUpdated).getTime() : 0;
        const shouldBeOffline = (now - lastUpdated) > config.sensorTimeoutMs;
        if (shouldBeOffline && s.status !== 'offline') {
          s.status = 'offline';
          statusChanged = true;
        }
      });

      if (statusChanged) {
        wsService.broadcast('fleet_status_update', {
          sensors: db.getAllSensors(),
          devices: db.getAllDevices()
        });
      }
    }, 10000);
  }
}

const sensorService = new SensorService();
module.exports = sensorService;

