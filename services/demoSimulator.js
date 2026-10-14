/**
 * Demo Mode Simulator
 * Generates realistic physical sensor telemetry when physical hardware is not connected.
 * All readings are strictly flagged with `isDemo: true` and never polluted with real hardware data.
 */
const sensorService = require('./sensorService');
const config = require('../config');
const wsService = require('./websocketService');

class DemoSimulator {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.tickCount = 0;

    // Simulation baselines and state
    this.state = {
      temp: 24.5,
      humidity: 52.0,
      pressure: 1013.25,
      vibration: 0.12,
      voltage: 4.15
    };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Demo Simulator] Started generating realistic simulated sensor data');

    this.timer = setInterval(() => {
      this.generateTick();
    }, config.demoIntervalMs);

    wsService.broadcast('mode_status', { isDemoMode: true });
  }

  stop() {
    if (!this.isRunning) return;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[Demo Simulator] Stopped');
    wsService.broadcast('mode_status', { isDemoMode: false });
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: config.demoIntervalMs
    };
  }

  /**
   * Generates realistic continuous physical readings
   */
  generateTick() {
    this.tickCount++;

    // 1. Temperature: Smooth natural drift with occasional solar/industrial heat surge
    const tempNoise = (Math.random() - 0.5) * 0.4;
    // Every 30 ticks, simulate a subtle thermal cycle
    const tempCycle = Math.sin(this.tickCount / 10) * 1.5;
    this.state.temp = parseFloat((23.0 + tempCycle + tempNoise).toFixed(1));

    // 2. Humidity: Inversely related to temperature
    const humNoise = (Math.random() - 0.5) * 0.6;
    this.state.humidity = parseFloat((55.0 - (tempCycle * 1.2) + humNoise).toFixed(1));

    // 3. Pressure: Atmospheric micro-fluctuations (1011.5 - 1015.0 hPa)
    const pressNoise = (Math.random() - 0.5) * 0.3;
    this.state.pressure = parseFloat((1013.25 + pressNoise).toFixed(2));

    // 4. Vibration: Machine motor frequency with occasional spike to test alerts
    let vibNoise = Math.random() * 0.15;
    // Trigger an alert spike roughly once every 40 ticks
    if (this.tickCount % 40 === 0) {
      vibNoise = 1.35; // exceeds 1.2g threshold
    }
    this.state.vibration = parseFloat(vibNoise.toFixed(2));

    // 5. Voltage: Slow battery discharge curve (3.65V to 4.20V)
    const voltNoise = (Math.random() - 0.5) * 0.02;
    this.state.voltage = parseFloat((4.05 + voltNoise).toFixed(2));

    // Ingest simulated packets through the standard sensorService pipeline with isDemo = true
    const simulatedReadings = [
      {
        sensorId: 'temp-01',
        sensorName: 'Ambient Temperature (Demo)',
        sensorType: 'temperature',
        value: this.state.temp,
        unit: '°C',
        deviceId: 'esp32-node-01',
        deviceName: 'ESP32 Main Node (Industrial Bench)',
        timestamp: new Date().toISOString()
      },
      {
        sensorId: 'hum-01',
        sensorName: 'Relative Humidity (Demo)',
        sensorType: 'humidity',
        value: this.state.humidity,
        unit: '%',
        deviceId: 'esp32-node-01',
        deviceName: 'ESP32 Main Node (Industrial Bench)',
        timestamp: new Date().toISOString()
      },
      {
        sensorId: 'press-01',
        sensorName: 'Atmospheric Pressure (Demo)',
        sensorType: 'pressure',
        value: this.state.pressure,
        unit: 'hPa',
        deviceId: 'esp32-node-01',
        deviceName: 'ESP32 Main Node (Industrial Bench)',
        timestamp: new Date().toISOString()
      },
      {
        sensorId: 'vib-01',
        sensorName: 'Motor Vibration Axis-Z (Demo)',
        sensorType: 'vibration',
        value: this.state.vibration,
        unit: 'g',
        deviceId: 'esp8266-node-02',
        deviceName: 'ESP8266 Secondary Node (HVAC)',
        timestamp: new Date().toISOString()
      },
      {
        sensorId: 'volt-01',
        sensorName: 'Device Supply Voltage (Demo)',
        sensorType: 'voltage',
        value: this.state.voltage,
        unit: 'V',
        deviceId: 'esp8266-node-02',
        deviceName: 'ESP8266 Secondary Node (HVAC)',
        timestamp: new Date().toISOString()
      }
    ];

    simulatedReadings.forEach((reading) => {
      try {
        sensorService.processReading(reading, true, '127.0.0.1 (Demo Engine)');
      } catch (err) {
        // silent catch for simulator
      }
    });
  }
}

const demoSimulator = new DemoSimulator();
module.exports = demoSimulator;

