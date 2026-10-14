import React from 'react';
import SensorCard from './SensorCard';

export default function SensorGrid({ telemetry, isConnected }) {
  const d = telemetry || {};

  // Format Buzzer
  let buzzerText = '--';
  let buzzerPillType = 'pill-off';
  if (d.buzzer !== null && d.buzzer !== undefined) {
    buzzerText = d.buzzer ? 'ON' : 'OFF';
    buzzerPillType = d.buzzer ? 'pill-on' : 'pill-off';
  }

  // Format Wi-Fi
  let wifiText = '--';
  let wifiPillType = 'pill-offline';
  if (d.wifi_status && d.wifi_status !== 'disconnected') {
    wifiText = d.wifi_status === 'connected' ? 'Connected' : d.wifi_status;
    wifiPillType = 'pill-online';
  } else if (isConnected) {
    wifiText = 'Connected';
    wifiPillType = 'pill-online';
  }

  return (
    <section className="sensor-grid">
      {/* Card 1: Heart Rate */}
      <SensorCard
        title="Heart Rate"
        value={d.heart_rate}
        unit="BPM"
        accentClass="icon-hr"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        }
      />

      {/* Card 2: Temperature */}
      <SensorCard
        title="Temperature"
        value={d.temperature}
        unit="°C"
        accentClass="icon-temp"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path>
          </svg>
        }
      />

      {/* Card 3: Voltage */}
      <SensorCard
        title="Voltage"
        value={d.voltage}
        unit="V"
        accentClass="icon-volt"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
            <line x1="22" y1="11" x2="22" y2="13"></line>
            <line x1="6" y1="11" x2="6" y2="13"></line>
            <line x1="10" y1="11" x2="10" y2="13"></line>
          </svg>
        }
      />

      {/* Card 4: Servo Angle */}
      <SensorCard
        title="Servo Angle"
        value={d.servo_angle}
        unit="°"
        accentClass="icon-servo"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        }
      />

      {/* Card 5: Buzzer */}
      <SensorCard
        title="Buzzer"
        value={buzzerText}
        isPill={true}
        pillType={buzzerPillType}
        accentClass="icon-buzzer"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        }
      />

      {/* Card 6: ESP32 / Wi-Fi */}
      <SensorCard
        title="ESP32 / Wi-Fi"
        value={wifiText}
        isPill={true}
        pillType={wifiPillType}
        accentClass="icon-wifi"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        }
      />
    </section>
  );
}

