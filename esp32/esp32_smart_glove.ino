/*
 ==============================================================================
  SMART GLOVE – ESP32 Health Monitoring & Gesture Telemetry Firmware
 ==============================================================================
  Description:
    Reads physiological and glove sensors (Heart Rate, Temperature,
    Battery Voltage, Servo Angle, Buzzer) and transmits JSON telemetry
    over Wi-Fi via HTTP POST to the Smart Glove Dashboard Backend.

  Hardware Requirements:
    - ESP32 Development Board (e.g. ESP32-WROOM-32)
    - Heart Rate / Pulse Sensor (Analog pin or I2C MAX30102)
    - Temperature Sensor (Analog Thermistor / DS18B20 / NTC)
    - Battery Voltage Divider (connected to ADC)
    - Servo Motor (PWM Pin)
    - Buzzer / Piezo (Digital Output Pin)
    - Status LED (Built-in GPIO 2)

  Libraries Required:
    - WiFi.h (Built into ESP32 core)
    - HTTPClient.h (Built into ESP32 core)
    - ArduinoJson.h (Install via Library Manager: "ArduinoJson" by Benoit Blanchon)
 ==============================================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ----------------------------------------------------------------------------
// Wi-Fi Configuration (Replace with your local network credentials)
// ----------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ----------------------------------------------------------------------------
// Dashboard Server Configuration
// Enter the IP address of the computer running the Flask backend
// Ensure the computer and ESP32 are on the SAME local Wi-Fi network!
// ----------------------------------------------------------------------------
const char* SERVER_HOST   = "192.168.1.100";  // Replace with your PC's IP
const int   SERVER_PORT   = 5000;
const char* API_ENDPOINT  = "/api/sensor-data";

// Telemetry transmit interval (in milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 2000;
unsigned long lastTransmissionTime = 0;

// ----------------------------------------------------------------------------
// Pin Definitions (Configurable Placeholders)
// ----------------------------------------------------------------------------
const int PIN_HEART_RATE   = 36;  // ADC1_CH0 (VP) Analog Pulse Input
const int PIN_TEMPERATURE  = 39;  // ADC1_CH3 (VN) Temperature Sensor
const int PIN_BATTERY_VOLT = 34;  // ADC1_CH6 Voltage Divider Input
const int PIN_SERVO_PWM    = 18;  // GPIO 18 Servo PWM Output
const int PIN_BUZZER       = 19;  // GPIO 19 Buzzer Control Output
const int PIN_STATUS_LED   = 2;   // GPIO 2 Onboard Blue LED

// Glove State Variables
float currentHeartRate   = 0.0;
float currentTemperature = 0.0;
float currentVoltage     = 0.0;
int   currentServoAngle  = 90;
bool  buzzerActive       = false;

// ----------------------------------------------------------------------------
// Wi-Fi Connection Routine
// ----------------------------------------------------------------------------
void connectToWiFi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] Assigned ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    digitalWrite(PIN_STATUS_LED, LOW);
    Serial.println("\n[WiFi] Failed to connect to Wi-Fi. Retrying in background...");
  }
}

// ----------------------------------------------------------------------------
// Sensor Acquisition Routines (Placeholders for real physical sensor logic)
// ----------------------------------------------------------------------------
void readSmartGloveSensors() {
  // 1. Read Heart Rate (Pulse Sensor ADC reading mapped to realistic BPM)
  int hrRaw = analogRead(PIN_HEART_RATE);
  // Example calculation / mapping:
  if (hrRaw > 500) {
    currentHeartRate = map(hrRaw, 500, 4095, 65, 110);
  } else {
    currentHeartRate = 72.0; // Fallback nominal heart rate
  }

  // 2. Read Skin Temperature (Thermistor ADC reading)
  int tempRaw = analogRead(PIN_TEMPERATURE);
  // Example NTC thermistor mapping for skin temperature (30.0 - 36.0 C):
  currentTemperature = 31.0 + (tempRaw / 4095.0) * 5.0;

  // 3. Read Battery Voltage (Voltage Divider with 100k / 100k resistors)
  int voltRaw = analogRead(PIN_BATTERY_VOLT);
  // ESP32 ADC: 3.3V reference / 4095 steps * 2 (divider ratio)
  currentVoltage = (voltRaw / 4095.0) * 3.3 * 2.0;

  // 4. Read / Track Servo Angle (0 - 180 degrees)
  // For demonstration: dynamically flex between 45 and 135 degrees
  static int angleDir = 5;
  currentServoAngle += angleDir;
  if (currentServoAngle >= 140 || currentServoAngle <= 40) {
    angleDir = -angleDir;
  }

  // 5. Check Buzzer Condition (e.g. sound buzzer if Heart Rate > 100 BPM)
  buzzerActive = (currentHeartRate > 95.0);
  digitalWrite(PIN_BUZZER, buzzerActive ? HIGH : LOW);
}

// ----------------------------------------------------------------------------
// Transmit Telemetry Payload to Backend API
// ----------------------------------------------------------------------------
void transmitTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Telemetry] Wi-Fi lost. Attempting reconnection...");
    connectToWiFi();
    return;
  }

  HTTPClient http;
  String url = "http://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + String(API_ENDPOINT);

  Serial.print("[HTTP] Sending POST to: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON document
  StaticJsonDocument<256> doc;
  doc["heart_rate"]   = round(currentHeartRate);
  doc["temperature"]  = round(currentTemperature * 10.0) / 10.0;
  doc["voltage"]      = round(currentVoltage * 100.0) / 100.0;
  doc["servo_angle"]  = currentServoAngle;
  doc["buzzer"]       = buzzerActive;
  doc["wifi_status"]  = "connected";

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.print("[HTTP] Payload: ");
  Serial.println(requestBody);

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0) {
    Serial.print("[HTTP] Success response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("[HTTP] Server Response: " + response);
  } else {
    Serial.print("[HTTP] Error sending POST: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ----------------------------------------------------------------------------
// Setup
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n========================================================");
  Serial.println(" SMART GLOVE – ESP32 Health Monitoring Node");
  Serial.println("========================================================");

  // Initialize GPIO Pins
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_STATUS_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Connect to Wi-Fi network
  connectToWiFi();
}

// ----------------------------------------------------------------------------
// Main Loop
// ----------------------------------------------------------------------------
void loop() {
  unsigned long currentMillis = millis();

  // Periodically read sensors and send telemetry
  if (currentMillis - lastTransmissionTime >= TELEMETRY_INTERVAL_MS) {
    lastTransmissionTime = currentMillis;

    // Read physical sensors
    readSmartGloveSensors();

    // Transmit telemetry to dashboard
    transmitTelemetry();
  }
}

