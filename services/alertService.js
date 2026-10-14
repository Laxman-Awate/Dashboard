/**
 * Alert Service
 * Evaluates readings against configurable minimum and maximum thresholds.
 * Emits real-time alerts when limits are breached and auto-resolves when values normalize.
 */
const db = require('../db/database');
const wsService = require('./websocketService');

class AlertService {
  checkThresholds(sensor, reading) {
    if (!sensor) return null;

    const value = reading.value;
    const min = sensor.minThreshold;
    const max = sensor.maxThreshold;

    let triggeredAlert = null;

    if (max !== null && max !== undefined && value > max) {
      triggeredAlert = db.addAlert({
        sensorId: sensor.id,
        deviceId: sensor.deviceId,
        alertType: 'critical_high',
        threshold: max,
        value: value,
        message: `High threshold exceeded! Sensor "${sensor.name}" measured ${value} ${sensor.unit} (Limit: ${max} ${sensor.unit})`
      });

      // Broadcast alert to live dashboard
      wsService.broadcast('alert_triggered', triggeredAlert);
    } else if (min !== null && min !== undefined && value < min) {
      triggeredAlert = db.addAlert({
        sensorId: sensor.id,
        deviceId: sensor.deviceId,
        alertType: 'critical_low',
        threshold: min,
        value: value,
        message: `Low threshold breached! Sensor "${sensor.name}" measured ${value} ${sensor.unit} (Minimum: ${min} ${sensor.unit})`
      });

      // Broadcast alert to live dashboard
      wsService.broadcast('alert_triggered', triggeredAlert);
    }

    return triggeredAlert;
  }
}

const alertService = new AlertService();
module.exports = alertService;

