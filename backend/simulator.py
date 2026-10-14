"""
Smart Glove Sensor Simulator (Demo Mode)
Generates realistic physiological and glove telemetry:
- Heart Rate (BPM): 68 - 85 BPM with realistic pulse rhythm
- Skin Temperature: 32.0 - 34.5 °C (realistic palm/finger thermistor reading)
- Battery Voltage: 3.7 - 4.2 V (single cell 18650 / LiPo)
- Servo Motor Angle: 0° - 180° (simulating glove finger flex tracking)
- Buzzer Status: ON / OFF
- ESP32 Wi-Fi status: connected
"""
import time
import math
import random
import threading
from datetime import datetime
from database import insert_reading, get_config

class SmartGloveSimulator:
    def __init__(self, interval_seconds=2.0):
        self.interval = interval_seconds
        self.running = False
        self.thread = None
        self.tick = 0
        
        # State baselines
        self.base_hr = 74.0
        self.base_temp = 32.8
        self.base_voltage = 3.92
        self.base_angle = 90.0
        self.buzzer = False

    def start(self):
        if self.running:
            return
        self.running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("[Simulator] Demo Mode started - generating simulated Smart Glove sensor telemetry.")

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread = None
        print("[Simulator] Demo Mode stopped.")

    def _run_loop(self):
        while self.running:
            try:
                # Check if demo mode is still active in config
                cfg = get_config()
                if not cfg.get('demo_mode', True):
                    time.sleep(1.0)
                    continue

                self.tick += 1
                
                # 1. Heart Rate: smooth natural fluctuation + heart rate variability
                hr_wave = math.sin(self.tick / 5.0) * 4.0
                hr_noise = (random.random() - 0.5) * 3.0
                current_hr = round(max(60.0, min(105.0, self.base_hr + hr_wave + hr_noise)))

                # 2. Skin Temperature (°C): subtle thermal drift
                temp_noise = (random.random() - 0.5) * 0.15
                current_temp = round(max(31.0, min(36.0, self.base_temp + (math.sin(self.tick / 20.0) * 0.5) + temp_noise)), 1)

                # 3. Voltage (V): stable LiPo voltage around 3.9V
                volt_noise = (random.random() - 0.5) * 0.02
                current_voltage = round(max(3.5, min(4.2, self.base_voltage + volt_noise)), 2)

                # 4. Servo Angle (°): simulated finger flexure cycling smoothly
                angle_wave = (math.sin(self.tick / 8.0) + 1.0) * 45.0 + 45.0  # 45 to 135 degrees
                current_angle = round(angle_wave)

                # 5. Buzzer: Triggered briefly if HR exceeds 82 or angle > 130
                buzzer_on = (current_hr > 82) or (self.tick % 30 == 0)

                reading_payload = {
                    'heart_rate': current_hr,
                    'temperature': current_temp,
                    'voltage': current_voltage,
                    'servo_angle': current_angle,
                    'buzzer': buzzer_on,
                    'wifi_status': 'connected',
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }

                insert_reading(reading_payload, is_demo=True, device_ip='127.0.0.1 (Demo Mode)')

            except Exception as e:
                print(f"[Simulator Error]: {e}")

            time.sleep(self.interval)

simulator = SmartGloveSimulator(interval_seconds=1.5)

