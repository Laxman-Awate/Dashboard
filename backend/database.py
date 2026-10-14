"""
Database module for Smart Glove Health Monitoring Dashboard.
Uses SQLite to store historical sensor readings with timestamps,
device status, and demo data flags.
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'smart_glove.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table for storing all telemetry readings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            heart_rate REAL,
            temperature REAL,
            voltage REAL,
            servo_angle REAL,
            buzzer INTEGER DEFAULT 0,
            wifi_status TEXT DEFAULT 'disconnected',
            device_ip TEXT,
            is_demo INTEGER DEFAULT 0,
            timestamp TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table for device connection configurations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS device_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            esp32_ip TEXT DEFAULT '192.168.4.1',
            is_connected INTEGER DEFAULT 0,
            demo_mode INTEGER DEFAULT 1,
            last_connected TEXT
        )
    ''')

    # Seed default device config if not present
    cursor.execute('SELECT COUNT(*) FROM device_config WHERE id = 1')
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO device_config (id, esp32_ip, is_connected, demo_mode, last_connected)
            VALUES (1, '192.168.4.1', 0, 1, NULL)
        ''')

    conn.commit()
    conn.close()
    print(f"[Database] SQLite initialized at: {DB_PATH}")

def insert_reading(data, is_demo=False, device_ip=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    timestamp = data.get('timestamp') or datetime.utcnow().isoformat() + 'Z'
    buzzer_val = 1 if data.get('buzzer') in [True, 1, 'ON', 'on'] else 0

    cursor.execute('''
        INSERT INTO sensor_readings (
            heart_rate, temperature, voltage, servo_angle,
            buzzer, wifi_status, device_ip, is_demo, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('heart_rate'),
        data.get('temperature'),
        data.get('voltage'),
        data.get('servo_angle'),
        buzzer_val,
        data.get('wifi_status', 'connected'),
        device_ip,
        1 if is_demo else 0,
        timestamp
    ))

    # Keep database lean: limit to last 5000 readings
    cursor.execute('''
        DELETE FROM sensor_readings WHERE id NOT IN (
            SELECT id FROM sensor_readings ORDER BY id DESC LIMIT 5000
        )
    ''')

    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id

def get_latest_reading(prefer_demo=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    if prefer_demo is not None:
        cursor.execute('''
            SELECT * FROM sensor_readings 
            WHERE is_demo = ? 
            ORDER BY id DESC LIMIT 1
        ''', (1 if prefer_demo else 0,))
    else:
        cursor.execute('''
            SELECT * FROM sensor_readings 
            ORDER BY id DESC LIMIT 1
        ''')

    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            'heart_rate': row['heart_rate'],
            'temperature': row['temperature'],
            'voltage': row['voltage'],
            'servo_angle': row['servo_angle'],
            'buzzer': bool(row['buzzer']),
            'wifi_status': row['wifi_status'],
            'device_ip': row['device_ip'],
            'is_demo': bool(row['is_demo']),
            'timestamp': row['timestamp']
        }
    return None

def get_heart_rate_history(limit=30, is_demo=None):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = 'SELECT timestamp, heart_rate, is_demo FROM sensor_readings WHERE heart_rate IS NOT NULL'
    params = []

    if is_demo is not None:
        query += ' AND is_demo = ?'
        params.append(1 if is_demo else 0)

    query += ' ORDER BY id DESC LIMIT ?'
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    # Return chronological order (oldest to newest)
    result = []
    for r in reversed(rows):
        result.append({
            'timestamp': r['timestamp'],
            'heart_rate': r['heart_rate'],
            'is_demo': bool(r['is_demo'])
        })
    return result

def get_config():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM device_config WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            'esp32_ip': row['esp32_ip'],
            'is_connected': bool(row['is_connected']),
            'demo_mode': bool(row['demo_mode']),
            'last_connected': row['last_connected']
        }
    return {'esp32_ip': '192.168.4.1', 'is_connected': False, 'demo_mode': True, 'last_connected': None}

def update_config(esp32_ip=None, is_connected=None, demo_mode=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    current = get_config()
    new_ip = esp32_ip if esp32_ip is not None else current['esp32_ip']
    new_conn = 1 if (is_connected if is_connected is not None else current['is_connected']) else 0
    new_demo = 1 if (demo_mode if demo_mode is not None else current['demo_mode']) else 0
    last_conn = datetime.utcnow().isoformat() + 'Z' if new_conn else current['last_connected']

    cursor.execute('''
        UPDATE device_config SET
            esp32_ip = ?,
            is_connected = ?,
            demo_mode = ?,
            last_connected = ?
        WHERE id = 1
    ''', (new_ip, new_conn, new_demo, last_conn))

    conn.commit()
    conn.close()
    return get_config()

