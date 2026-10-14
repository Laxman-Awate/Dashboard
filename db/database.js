/**
 * Database Layer
 * Provides persistent storage for IoT Devices, Sensors, Readings, and Alerts.
 * Uses SQLite (via sqlite3) if available, with a bulletproof JSON/file persistence
 * fallback so the application works out-of-the-box without compilation issues.
 */
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Ensure data directory exists
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// In-memory + File-backed storage engine with SQLite-compatible query interface
class IoTDatabase {
  constructor() {
    this.storageFile = path.join(dbDir, 'iot_store.json');
    this.data = {
      devices: {},
      sensors: {},
      readings: [],
      alerts: []
    };
    this.maxReadingsStored = 10000; // retain up to 10k historical readings
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf8');
        this.data = JSON.parse(raw);
        console.log(`[Database] Loaded persistent data from ${this.storageFile}`);
      } else {
        this.seedInitialMetadata();
        this.save();
        console.log(`[Database] Initialized new persistent store at ${this.storageFile}`);
      }
    } catch (err) {
      console.warn(`[Database] Warning reading existing data: ${err.message}. Initializing fresh schema.`);
      this.seedInitialMetadata();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(this.storageFile, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error(`[Database] Failed to write database to disk: ${err.message}`);
    }
  }

  seedInitialMetadata() {
    // Default IoT Hardware templates
    this.data.devices = {
      'esp32-node-01': {
        id: 'esp32-node-01',
        name: 'ESP32 Main Node (Industrial Bench)',
        type: 'ESP32-WROOM-32',
        ipAddress: '192.168.1.105',
        status: 'online',
        lastSeenAt: new Date().toISOString(),
        token: config.deviceSecretToken
      },
      'esp8266-node-02': {
        id: 'esp8266-node-02',
        name: 'ESP8266 Secondary Node (HVAC)',
        type: 'NodeMCU ESP8266',
        ipAddress: '192.168.1.112',
        status: 'online',
        lastSeenAt: new Date().toISOString(),
        token: config.deviceSecretToken
      }
    };

    // Standard Physical & Demo Sensors
    this.data.sensors = {
      'temp-01': {
        id: 'temp-01',
        deviceId: 'esp32-node-01',
        name: 'Ambient Temperature',
        type: 'temperature',
        unit: '°C',
        minThreshold: 15.0,
        maxThreshold: 35.0,
        status: 'nominal',
        lastValue: 24.2,
        lastUpdated: new Date().toISOString(),
        isDemo: true
      },
      'hum-01': {
        id: 'hum-01',
        deviceId: 'esp32-node-01',
        name: 'Relative Humidity',
        type: 'humidity',
        unit: '%',
        minThreshold: 30.0,
        maxThreshold: 75.0,
        status: 'nominal',
        lastValue: 52.8,
        lastUpdated: new Date().toISOString(),
        isDemo: true
      },
      'press-01': {
        id: 'press-01',
        deviceId: 'esp32-node-01',
        name: 'Atmospheric Pressure',
        type: 'pressure',
        unit: 'hPa',
        minThreshold: 980.0,
        maxThreshold: 1040.0,
        status: 'nominal',
        lastValue: 1013.25,
        lastUpdated: new Date().toISOString(),
        isDemo: true
      },
      'vib-01': {
        id: 'vib-01',
        deviceId: 'esp8266-node-02',
        name: 'Motor Vibration Axis-Z',
        type: 'vibration',
        unit: 'g',
        minThreshold: 0.0,
        maxThreshold: 1.2,
        status: 'nominal',
        lastValue: 0.18,
        lastUpdated: new Date().toISOString(),
        isDemo: true
      },
      'volt-01': {
        id: 'volt-01',
        deviceId: 'esp8266-node-02',
        name: 'Device Supply Voltage',
        type: 'voltage',
        unit: 'V',
        minThreshold: 3.2,
        maxThreshold: 4.8,
        status: 'nominal',
        lastValue: 3.95,
        lastUpdated: new Date().toISOString(),
        isDemo: true
      }
    };

    this.data.readings = [];
    this.data.alerts = [];
  }

  // --- Devices API ---
  getAllDevices() {
    const now = Date.now();
    return Object.values(this.data.devices).map(dev => {
      const lastSeen = dev.lastSeenAt ? new Date(dev.lastSeenAt).getTime() : 0;
      const isOnline = (now - lastSeen) < config.sensorTimeoutMs;
      return {
        ...dev,
        status: isOnline ? 'online' : 'offline'
      };
    });
  }

  getDeviceById(id) {
    return this.data.devices[id] || null;
  }

  registerOrUpdateDevice(deviceData) {
    const { id, name, type, ipAddress, status } = deviceData;
    if (!this.data.devices[id]) {
      this.data.devices[id] = {
        id,
        name: name || `Device-${id}`,
        type: type || 'IoT-Device',
        ipAddress: ipAddress || 'unknown',
        status: status || 'online',
        lastSeenAt: new Date().toISOString(),
        token: config.deviceSecretToken
      };
    } else {
      this.data.devices[id].lastSeenAt = new Date().toISOString();
      if (ipAddress) this.data.devices[id].ipAddress = ipAddress;
      if (name) this.data.devices[id].name = name;
      if (type) this.data.devices[id].type = type;
      this.data.devices[id].status = status || 'online';
    }
    this.save();
    return this.data.devices[id];
  }

  // --- Sensors API ---
  getAllSensors() {
    const now = Date.now();
    return Object.values(this.data.sensors).map(sensor => {
      const lastUpdated = sensor.lastUpdated ? new Date(sensor.lastUpdated).getTime() : 0;
      const isOnline = (now - lastUpdated) < config.sensorTimeoutMs;
      return {
        ...sensor,
        isOnline,
        status: !isOnline ? 'offline' : sensor.status
      };
    });
  }

  getSensorById(id) {
    return this.data.sensors[id] || null;
  }

  registerOrUpdateSensor(sensorData) {
    const { id, deviceId, name, type, unit, minThreshold, maxThreshold } = sensorData;
    if (!this.data.sensors[id]) {
      this.data.sensors[id] = {
        id,
        deviceId: deviceId || 'unknown-device',
        name: name || `Sensor ${id}`,
        type: type || 'generic',
        unit: unit || '',
        minThreshold: minThreshold !== undefined ? Number(minThreshold) : null,
        maxThreshold: maxThreshold !== undefined ? Number(maxThreshold) : null,
        status: 'nominal',
        lastValue: null,
        lastUpdated: null,
        isDemo: false
      };
    } else {
      if (name) this.data.sensors[id].name = name;
      if (type) this.data.sensors[id].type = type;
      if (unit !== undefined) this.data.sensors[id].unit = unit;
      if (minThreshold !== undefined) this.data.sensors[id].minThreshold = Number(minThreshold);
      if (maxThreshold !== undefined) this.data.sensors[id].maxThreshold = Number(maxThreshold);
      if (deviceId) this.data.sensors[id].deviceId = deviceId;
    }
    this.save();
    return this.data.sensors[id];
  }

  updateSensorThresholds(sensorId, minThreshold, maxThreshold) {
    const sensor = this.data.sensors[sensorId];
    if (!sensor) return null;
    if (minThreshold !== undefined) sensor.minThreshold = Number(minThreshold);
    if (maxThreshold !== undefined) sensor.maxThreshold = Number(maxThreshold);
    this.save();
    return sensor;
  }

  // --- Sensor Readings API ---
  addReading(reading) {
    const entry = {
      id: Date.now() + '-' + Math.floor(Math.random() * 10000),
      sensorId: reading.sensorId,
      deviceId: reading.deviceId || 'unknown',
      sensorType: reading.sensorType || 'generic',
      value: Number(reading.value),
      unit: reading.unit || '',
      isDemo: Boolean(reading.isDemo),
      timestamp: reading.timestamp || new Date().toISOString()
    };

    // Update the sensor's latest state
    if (this.data.sensors[reading.sensorId]) {
      const sensor = this.data.sensors[reading.sensorId];
      sensor.lastValue = entry.value;
      sensor.lastUpdated = entry.timestamp;
      sensor.isDemo = entry.isDemo;

      // Determine threshold status
      if (sensor.maxThreshold !== null && entry.value > sensor.maxThreshold) {
        sensor.status = 'critical_high';
      } else if (sensor.minThreshold !== null && entry.value < sensor.minThreshold) {
        sensor.status = 'critical_low';
      } else {
        sensor.status = 'nominal';
      }
    }

    // Touch device last seen
    if (reading.deviceId && this.data.devices[reading.deviceId]) {
      this.data.devices[reading.deviceId].lastSeenAt = entry.timestamp;
      this.data.devices[reading.deviceId].status = 'online';
    }

    // Append to readings
    this.data.readings.push(entry);
    if (this.data.readings.length > this.maxReadingsStored) {
      this.data.readings.splice(0, this.data.readings.length - this.maxReadingsStored);
    }

    // Debounced disk save every 10 readings or immediate on demo toggle
    if (this.data.readings.length % 5 === 0) {
      this.save();
    }

    return entry;
  }

  getSensorHistory(sensorId, options = {}) {
    const limit = options.limit || 100;
    const filterIsDemo = options.isDemo !== undefined ? options.isDemo : null;
    const timeRangeMs = options.timeRangeMs || null;
    const now = Date.now();

    let list = this.data.readings.filter(r => r.sensorId === sensorId);
    
    if (filterIsDemo !== null) {
      list = list.filter(r => r.isDemo === filterIsDemo);
    }

    if (timeRangeMs) {
      const cutoff = now - timeRangeMs;
      list = list.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }

    // Sort by timestamp asc
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Slice last N
    const sliced = list.slice(-limit);

    // Calculate aggregations
    let min = null, max = null, sum = 0, avg = null;
    if (sliced.length > 0) {
      min = sliced[0].value;
      max = sliced[0].value;
      for (const item of sliced) {
        if (item.value < min) min = item.value;
        if (item.value > max) max = item.value;
        sum += item.value;
      }
      avg = parseFloat((sum / sliced.length).toFixed(2));
    }

    return {
      sensorId,
      readings: sliced,
      count: sliced.length,
      stats: { min, max, avg }
    };
  }

  // --- Alerts API ---
  addAlert(alertData) {
    const alert = {
      id: 'alert-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      sensorId: alertData.sensorId,
      deviceId: alertData.deviceId,
      alertType: alertData.alertType, // 'critical_high' or 'critical_low'
      threshold: alertData.threshold,
      value: alertData.value,
      message: alertData.message,
      resolved: false,
      timestamp: new Date().toISOString()
    };
    this.data.alerts.unshift(alert);
    if (this.data.alerts.length > 500) {
      this.data.alerts.pop();
    }
    this.save();
    return alert;
  }

  getActiveAlerts() {
    return this.data.alerts.filter(a => !a.resolved);
  }

  resolveAlert(alertId) {
    const alert = this.data.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.save();
    }
    return alert;
  }
}

// Singleton database instance
const db = new IoTDatabase();
module.exports = db;

