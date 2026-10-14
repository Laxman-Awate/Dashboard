import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ConnectionPanel from './components/ConnectionPanel';
import SensorGrid from './components/SensorGrid';
import HeartRateChart from './components/HeartRateChart';
import {
  getLatestSensorData,
  getHeartRateHistory,
  connectDevice,
  disconnectDevice,
  getConnectionStatus,
  toggleDemoMode
} from './services/api';
import './App.css';

export default function App() {
  const [espIp, setEspIp] = useState('192.168.4.1');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [telemetry, setTelemetry] = useState(null);
  const [hrHistory, setHrHistory] = useState([]);

  // Fetch initial connection status
  useEffect(() => {
    async function init() {
      try {
        const status = await getConnectionStatus();
        setIsConnected(status.is_connected);
        setIsDemoMode(status.demo_mode);
        if (status.esp32_ip) setEspIp(status.esp32_ip);
      } catch (err) {
        console.warn('Initial connection status check:', err);
      }
    }
    init();
  }, []);

  // Polling loop for real-time telemetry (1.5s interval)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const latest = await getLatestSensorData();
        setTelemetry(latest);

        const history = await getHeartRateHistory(30);
        setHrHistory(history);
      } catch (err) {
        console.warn('Telemetry polling error:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [isConnected, isDemoMode]);

  // Connect/Disconnect handler
  const handleConnect = async () => {
    if (isConnected) {
      try {
        await disconnectDevice();
        setIsConnected(false);
        const latest = await getLatestSensorData();
        setTelemetry(latest);
      } catch (err) {
        alert('Disconnect failed: ' + err.message);
      }
      return;
    }

    if (!espIp.trim()) {
      alert('Please enter an ESP32 IP address');
      return;
    }

    setIsConnecting(true);
    try {
      const res = await connectDevice(espIp.trim());
      if (res.connected) {
        setIsConnected(true);
      } else {
        alert(res.message || 'Could not connect to ESP32 at this IP.');
        setIsConnected(false);
      }
    } catch (err) {
      alert('Connection failed: ' + err.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Demo Mode toggle handler
  const handleToggleDemo = async () => {
    try {
      const res = await toggleDemoMode();
      setIsDemoMode(res.demo_mode);
      const latest = await getLatestSensorData();
      setTelemetry(latest);
      const history = await getHeartRateHistory(30);
      setHrHistory(history);
    } catch (err) {
      alert('Toggle demo mode failed: ' + err.message);
    }
  };

  return (
    <div className="app-container">
      {/* 1. Header */}
      <Header />

      <main className="main-content">
        {/* Demo Mode Alert Banner */}
        {isDemoMode && (
          <div className="demo-banner active">
            <div className="banner-left">
              <span className="demo-badge-tag">Demo Mode</span>
              <span>
                Displaying simulated Smart Glove sensor telemetry. Switch to Real Hardware Mode to receive live ESP32 readings.
              </span>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleToggleDemo}
            >
              Switch to Real Hardware
            </button>
          </div>
        )}

        {/* 2. Connection Panel */}
        <ConnectionPanel
          espIp={espIp}
          setEspIp={setEspIp}
          isConnected={isConnected}
          isConnecting={isConnecting}
          onConnect={handleConnect}
          isDemoMode={isDemoMode}
          onToggleDemo={handleToggleDemo}
        />

        {/* 3. Sensor Cards Grid */}
        <SensorGrid telemetry={telemetry} isConnected={isConnected} />

        {/* 4. Live Heart Rate Graph Panel */}
        <HeartRateChart
          history={hrHistory}
          lastTimestamp={telemetry?.timestamp}
          isDemo={telemetry?.is_demo}
        />
      </main>
    </div>
  );
}

