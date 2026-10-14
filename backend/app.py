"""
SMART GLOVE – Health Monitoring Dashboard
Flask Backend Application
"""
import os
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime

from database import (
    init_db,
    insert_reading,
    get_latest_reading,
    get_heart_rate_history,
    get_config,
    update_config
)
from simulator import simulator

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for React + Vite frontend

# Initialize database schema
init_db()

# Read initial config and start simulator if demo mode is enabled
initial_config = get_config()
if initial_config.get('demo_mode', True):
    simulator.start()

# -------------------------------------------------------------
# REST API Endpoints
# -------------------------------------------------------------

@app.route('/api/sensor-data', methods=['POST'])
def receive_sensor_data():
    """
    Receives real telemetry readings from physical ESP32 Smart Glove.
    Expected JSON:
    {
      "heart_rate": 78,
      "temperature": 32.5,
      "voltage": 3.7,
      "servo_angle": 90,
      "buzzer": false,
      "wifi_status": "connected",
      "timestamp": "2026-10-14T15:30:00Z"
    }
    """
    if not request.is_json:
        return jsonify({"status": "error", "message": "Request must be JSON"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Empty payload"}), 400

    # Extract client IP
    client_ip = request.remote_addr

    # Validate numbers
    validated = {}
    for key in ['heart_rate', 'temperature', 'voltage', 'servo_angle']:
        if key in data and data[key] is not None:
            try:
                validated[key] = float(data[key])
            except (ValueError, TypeError):
                validated[key] = None
        else:
            validated[key] = None

    validated['buzzer'] = bool(data.get('buzzer', False))
    validated['wifi_status'] = str(data.get('wifi_status', 'connected'))
    validated['timestamp'] = data.get('timestamp') or datetime.utcnow().isoformat() + 'Z'

    # Save to database as real hardware data (is_demo=False)
    reading_id = insert_reading(validated, is_demo=False, device_ip=client_ip)

    # Automatically set connection status to true when real data is received
    update_config(esp32_ip=client_ip, is_connected=True)

    return jsonify({
        "status": "success",
        "message": "Telemetry received and persisted",
        "reading_id": reading_id
    }), 201

@app.route('/api/sensor-data/latest', methods=['GET'])
def get_latest():
    """
    Returns the latest sensor reading.
    Respects demo_mode setting: if demo_mode is disabled and hardware is not connected,
    returns null fields so frontend renders '--' instead of invented values.
    """
    cfg = get_config()
    is_demo = cfg.get('demo_mode', True)
    is_connected = cfg.get('is_connected', False)

    # If demo mode is active, get latest demo reading
    # If demo mode is off and device is connected, get latest real reading
    # If demo mode is off and device is disconnected, return empty fields ('--')
    if is_demo:
        reading = get_latest_reading(prefer_demo=True)
    elif is_connected:
        reading = get_latest_reading(prefer_demo=False)
    else:
        reading = None

    if not reading:
        return jsonify({
            "heart_rate": None,
            "temperature": None,
            "voltage": None,
            "servo_angle": None,
            "buzzer": None,
            "wifi_status": "disconnected",
            "is_demo": is_demo,
            "timestamp": None
        })

    return jsonify(reading)

@app.route('/api/sensor-data/history', methods=['GET'])
def get_history():
    """
    Returns historical heart rate readings for the Live Heart Rate chart.
    Supports ?limit=30 query param.
    """
    cfg = get_config()
    is_demo = cfg.get('demo_mode', True)
    limit = int(request.args.get('limit', 30))

    history = get_heart_rate_history(limit=limit, is_demo=is_demo if is_demo else None)
    return jsonify(history)

@app.route('/api/connect', methods=['POST'])
def connect_device():
    """
    Attempts to connect to ESP32 at the given IP address.
    Verifies actual network reachability before reporting 'Connected'.
    """
    payload = request.get_json() or {}
    ip = payload.get('ip', '').strip()

    if not ip:
        return jsonify({"connected": False, "message": "Please provide a valid IP address"}), 400

    # In demo mode, simulate quick handshake
    cfg = get_config()
    if cfg.get('demo_mode', False) and (ip in ['127.0.0.1', 'localhost', '192.168.4.1', 'demo']):
        update_config(esp32_ip=ip, is_connected=True)
        return jsonify({
            "connected": True,
            "message": f"Connected to ESP32 Smart Glove at {ip} (Verified)",
            "ip": ip
        })

    # For real hardware, attempt HTTP ping to ESP32
    target_url = f"http://{ip}/status" if not ip.startswith('http') else f"{ip}/status"
    try:
        resp = requests.get(target_url, timeout=2.5)
        if resp.status_code == 200:
            update_config(esp32_ip=ip, is_connected=True)
            return jsonify({
                "connected": True,
                "message": f"Connected to ESP32 Smart Glove at {ip} (Verified)",
                "ip": ip
            })
        else:
            update_config(esp32_ip=ip, is_connected=False)
            return jsonify({
                "connected": False,
                "message": f"Device at {ip} returned HTTP status {resp.status_code}"
            }), 400
    except requests.exceptions.RequestException as e:
        update_config(esp32_ip=ip, is_connected=False)
        return jsonify({
            "connected": False,
            "message": f"Could not reach ESP32 at {ip}. Ensure device is powered on and connected to the same Wi-Fi network."
        }), 400

@app.route('/api/disconnect', methods=['POST'])
def disconnect_device():
    """Disconnects the active device session"""
    update_config(is_connected=False)
    return jsonify({"connected": False, "message": "Device disconnected"})

@app.route('/api/connection/status', methods=['GET'])
def get_connection_status():
    """Returns current device configuration and connectivity state"""
    cfg = get_config()
    return jsonify(cfg)

@app.route('/api/demo/toggle', methods=['POST'])
def toggle_demo():
    """Toggles Demo Mode simulation on/off"""
    cfg = get_config()
    new_demo_state = not cfg.get('demo_mode', True)
    update_config(demo_mode=new_demo_state)

    if new_demo_state:
        simulator.start()
    else:
        simulator.stop()

    return jsonify({
        "demo_mode": new_demo_state,
        "message": "Demo Mode enabled" if new_demo_state else "Demo Mode disabled (Real Hardware Mode active)"
    })

# -------------------------------------------------------------
# Frontend Static Files Serving
# -------------------------------------------------------------

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    static_dir = os.path.join(app.root_path, 'static')
    if path != "" and os.path.exists(os.path.join(static_dir, path)):
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"\n========================================================")
    print(f" SMART GLOVE – Health Monitoring Dashboard Backend")
    print(f" Running at: http://localhost:{port}")
    print(f" Demo Mode : {'ACTIVE (Simulating data)' if initial_config.get('demo_mode') else 'OFF'}")
    print(f"========================================================\n")
    app.run(host='0.0.0.0', port=port, debug=False)

