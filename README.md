# SMART GLOVE – Health Monitoring Dashboard

A dedicated, real-time health and gesture monitoring web application for an **ESP32-powered Smart Glove**. The dashboard visualizes real-time physiological telemetry (heart rate, skin temperature, battery voltage, robotic servo angle, buzzer alert, and device connectivity) received from physical sensors or a built-in realistic simulation engine.

---

## 📸 Dashboard Design & Features

Following the specified design reference:
- **Header**: Dark navy-blue background (`#0F172A`) with centered `SMART GLOVE` title and `Health Monitoring Dashboard` subtitle.
- **Connection Panel**:
  - ESP32 IP address input field.
  - **Connect / Disconnect** button verifying real network reachability.
  - Live connection indicator: **Connected** (pulsing green dot) / **Not Connected** (red dot).
  - Advisory notification: *"The device and browser must be connected to the same Wi-Fi network when using a local ESP32 server."*
  - **Demo Mode** toggle switch with active telemetry status.
- **Six Sensor Cards** (white cards, rounded corners, subtle shadows, responsive grid):
  1. **Heart Rate** (`BPM`) with pulsing red heart icon.
  2. **Temperature** (`°C`) with orange thermometer icon.
  3. **Voltage** (`V`) with green battery icon.
  4. **Servo Angle** (`°`) with blue gear icon.
  5. **Buzzer** (`ON` / `OFF`) with purple bell icon and status pill.
  6. **ESP32 / Wi-Fi** (`Connected` / `Disconnected`) with cyan antenna icon.
  *When sensor data is unavailable, cards display `--` instead of fabricated values.*
- **Live Heart Rate Graph Panel**:
  - Large white panel titled **"Live Heart Rate"** with pulsating indicator.
  - Real-time line chart with smooth tension curves and red gradient fill.
  - BPM values on Y-axis and timestamps on X-axis.
  - Automatically updates as new packets arrive while maintaining recent history.
  - **"Last update"** timestamp display.
  - Empty state overlay when no readings have been recorded.

---

## 🛠 Technology Stack

- **Frontend**: React 18 + Vite (and bundled standalone browser client)
- **Styling**: Modern responsive CSS with custom variables, glassmorphic accents, and Inter typography
- **Backend**: Python Flask with CORS support
- **Database**: SQLite (`smart_glove.db`) storing time-series telemetry and device configurations
- **Communication**: HTTP REST API with real-time polling
- **Hardware Target**: ESP32 microcontroller with Wi-Fi

---

## 📂 Project Structure

```
E:\Dashbord\
├── backend/
│   ├── app.py                     # Flask application entrypoint & REST API
│   ├── database.py                # SQLite database manager & schema
│   ├── simulator.py               # Smart Glove realistic physiological simulator (Demo Mode)
│   ├── test_esp32_simulator.py    # CLI tool simulating an external ESP32 sending HTTP packets
│   ├── requirements.txt           # Python dependencies (Flask, flask-cors, requests)
│   └── static/
│       └── index.html             # Standalone browser UI served directly by Flask
├── frontend/                      # React + Vite source code
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── components/
│       │   ├── Header.jsx         # Dark navy header
│       │   ├── ConnectionPanel.jsx # IP input, Connect button, status, Wi-Fi advisory
│       │   ├── SensorGrid.jsx     # 6 sensor cards grid
│       │   ├── SensorCard.jsx     # Card component with fallback '--' display
│       │   └── HeartRateChart.jsx # Live Chart.js graph with empty state
│       └── services/
│           └── api.js             # API client
├── esp32/
│   └── esp32_smart_glove.ino      # Ready-to-flash Arduino C++ firmware for ESP32
├── run_dashboard.bat              # One-click Windows starter batch script
└── README.md                      # Documentation
```

---

## 🚀 Quick Start Guide

### Option A: Run Immediately with Python (Recommended)

You can launch the complete full-stack application with a single command:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the Flask Backend & Dashboard
python app.py
```

Open your browser and navigate to:
👉 **`http://localhost:5000`**

*The application starts in **Demo Mode** by default, allowing you to preview live fluctuating sensor readings and graph updates immediately!*

---

### Option B: Run React + Vite in Development Mode

If you wish to modify or develop the React frontend using Vite hot-module replacement:

```bash
# Terminal 1: Start Flask Backend (Port 5000)
cd backend
python app.py

# Terminal 2: Start Vite Dev Server (Port 5173)
cd frontend
npm install
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`** (Vite automatically proxies API calls to `http://localhost:5000`).

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/sensor-data` | `POST` | Ingests telemetry from physical ESP32 or test scripts |
| `/api/sensor-data/latest` | `GET` | Returns latest readings or null fields (`--`) if offline |
| `/api/sensor-data/history` | `GET` | Returns historical heart rate points for the live chart (`?limit=30`) |
| `/api/connect` | `POST` | Validates reachability to ESP32 IP address before marking Connected |
| `/api/disconnect` | `POST` | Sets device connection state to disconnected |
| `/api/connection/status`| `GET` | Returns device IP, connection status, and demo mode flag |
| `/api/demo/toggle` | `POST` | Toggles realistic simulation Demo Mode on/off |

### Expected ESP32 JSON Payload (`POST /api/sensor-data`)

```json
{
  "heart_rate": 78,
  "temperature": 32.5,
  "voltage": 3.7,
  "servo_angle": 90,
  "buzzer": false,
  "wifi_status": "connected",
  "timestamp": "2026-10-14T15:30:00Z"
}
```

---

## 🧪 Testing Without Physical Hardware

### 1. Built-in Demo Mode (UI Switch)
- Toggle the **Demo Mode: ON / OFF** button on the dashboard.
- The simulator generates physiological data (heart rate 68-85 BPM, skin temp 32-34.5°C, voltage 3.7-4.1V, servo finger flexure 45-135°, and buzzer alerts).
- Telemetry is clearly tagged with a yellow **DEMO DATA** badge.

### 2. External Hardware Simulator CLI
To verify that the ingestion endpoint works over the network just like a real ESP32:

```bash
cd backend
python test_esp32_simulator.py
```
This script acts as a physical microcontroller on your local network, generating and sending real HTTP POST requests every 2 seconds.

---

## 🔌 Connecting Physical ESP32 Hardware

### 1. Wiring Table (Placeholders)

| Sensor / Component | Sensor Type | ESP32 Pin | Function |
| :--- | :--- | :--- | :--- |
| **Pulse Sensor** | Analog Pulse / MAX30102 | `GPIO 36` (VP) | Measures heart rate (BPM) |
| **Temperature** | NTC Thermistor / DS18B20 | `GPIO 39` (VN) | Measures palm/finger skin temp (°C) |
| **Voltage Divider** | 100kΩ / 100kΩ Resistors | `GPIO 34` | Reads LiPo / 18650 battery level (V) |
| **Servo Motor** | Micro Servo (SG90) | `GPIO 18` (PWM) | Controls robotic glove finger angle (°) |
| **Buzzer** | Active 5V / 3.3V Buzzer | `GPIO 19` | Auditory warning indicator |
| **Status LED** | Onboard Blue LED | `GPIO 2` | Wi-Fi connection indicator |

### 2. Flashing the Firmware

1. Open `esp32/esp32_smart_glove.ino` in the **Arduino IDE**.
2. Install the **ArduinoJson** library:
   - Go to `Sketch` → `Include Library` → `Manage Libraries...`
   - Search for `ArduinoJson` (by Benoit Blanchon) and click **Install**.
3. In `esp32_smart_glove.ino`, configure your Wi-Fi credentials and PC IP:
   ```cpp
   const char* WIFI_SSID     = "Your_WiFi_Name";
   const char* WIFI_PASSWORD = "Your_WiFi_Password";
   const char* SERVER_HOST   = "192.168.1.100"; // Replace with your PC's IP address
   const int   SERVER_PORT   = 5000;
   ```
4. Connect your ESP32 board via USB, select your board and COM port under `Tools`, and click **Upload**.
5. Open the Serial Monitor (`115200` baud) to observe the assigned IP address and outgoing HTTP packets.
6. On the dashboard, enter the assigned ESP32 IP address and click **Connect**.

