"""
External Hardware Test Simulator
Simulates a physical ESP32 Smart Glove device on the local network
sending HTTP POST requests to http://localhost:5000/api/sensor-data.
"""
import time
import requests
import random
from datetime import datetime

API_URL = "http://localhost:5000/api/sensor-data"

print("==========================================================")
print(" Simulating Physical ESP32 Smart Glove Hardware Transmitter")
print(f" Target API: {API_URL}")
print(" Press Ctrl+C to stop")
print("==========================================================")

tick = 0
while True:
    tick += 1
    # Generate realistic physical glove readings
    heart_rate = round(72 + (random.random() - 0.5) * 8)
    temperature = round(32.5 + (random.random() - 0.5) * 1.2, 1)
    voltage = round(3.85 + (random.random() - 0.5) * 0.1, 2)
    servo_angle = (tick * 10) % 180
    buzzer = (heart_rate > 78)

    payload = {
        "heart_rate": heart_rate,
        "temperature": temperature,
        "voltage": voltage,
        "servo_angle": servo_angle,
        "buzzer": buzzer,
        "wifi_status": "connected",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    try:
        response = requests.post(API_URL, json=payload, timeout=2.0)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmitted packet #{tick} -> HTTP {response.status_code} | HR: {heart_rate} BPM, Temp: {temperature} C, Volt: {voltage} V, Servo: {servo_angle} deg, Buzzer: {buzzer}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Transmission error (is backend running?): {e}")

    time.sleep(2.0)

