/*
 * StaySafe - Arduino R4 WIFI sketch
 *
 * Sends sensor data to backend API via WiFi
 * POST http://[server-ip]:3000/api/readings
 *
 * Uses direct IP address (no mDNS needed)
 * Collects 10 samples over 10 seconds, then sends average
 */

#include <WiFiS3.h>
#include <ArduinoJson.h>

// ===== WiFi Configuration =====
struct WiFiNetwork {
  const char* ssid;
  const char* password;
};

WiFiNetwork networks[] = {
  {"T-5DJBL9", "k621uh8bflnx"},
};
const int NETWORK_COUNT = sizeof(networks) / sizeof(networks[0]);

// ===== Backend Server Configuration =====
IPAddress serverIP(192, 168, 1, 48);  // Your Mac IP - UPDATE THIS if IP changes!
int serverPort = 3000;

// ===== Device Configuration =====
const int DEVICE_ID = 1;              // Device ID from database
const int SEND_INTERVAL = 10000;      // Send every 10 seconds (ms)

// ===== Sensor Pins =====
const int TEMP_SENSOR_PIN = A0;       // LM35 temperature sensor
const int LIGHT_SENSOR_PIN = A1;      // Phototransistor light sensor

// ===== Sampling Configuration =====
const int SAMPLE_COUNT = 10;          // 10 samples total
const int SAMPLE_INTERVAL = 1000;     // 1 sample per second (1000ms)
// Result: Collects 10 samples over 10 seconds, then averages and sends

float temperatureSamples[SAMPLE_COUNT];
int sampleIndex = 0;
int samplesCollected = 0;

unsigned long lastSendTime = 0;
unsigned long lastReadTime = 0;
WiFiClient client;

void setup() {
  Serial.begin(9600);
  delay(3000);  // Wait for Serial to initialize

  Serial.println("\n=== StaySafe Arduino R4 WIFI ===");
  Serial.println("Initializing...");

  // Initialize WiFi
  connectToWiFi();
}

void loop() {
  // Collect samples - read sensor every SAMPLE_INTERVAL ms (1 per second)
  if (millis() - lastReadTime >= SAMPLE_INTERVAL) {
    lastReadTime = millis();

    // Read sensor and store in buffer
    float temp = readTemperatureSensor();
    temperatureSamples[sampleIndex] = temp;
    sampleIndex = (sampleIndex + 1) % SAMPLE_COUNT;

    if (samplesCollected < SAMPLE_COUNT) {
      samplesCollected++;
    }
  }

  // Check if it's time to send data (every SEND_INTERVAL ms)
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    // Calculate average from samples
    float averageTemp = calculateAverage();

    // Read current light level
    int lightPercent = getLightPercentage();

    // Send both sensors to server
    sendDataToServer(averageTemp, lightPercent);
  }

  // Keep WiFi connection active
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Connection lost! Reconnecting...");
    connectToWiFi();
  }
}

// ===== WiFi Functions =====
void connectToWiFi() {
  for (int i = 0; i < NETWORK_COUNT; i++) {
    Serial.print("[WiFi] Attempt ");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.print(NETWORK_COUNT);
    Serial.print(" - Connecting to: ");
    Serial.println(networks[i].ssid);

    WiFi.begin(networks[i].ssid, networks[i].password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[WiFi] Connected!");
      Serial.print("[WiFi] SSID: ");
      Serial.println(networks[i].ssid);
      Serial.print("[WiFi] IP: ");
      Serial.println(WiFi.localIP());
      return;
    } else {
      Serial.println("\n[WiFi] Failed!");
      WiFi.end();
    }
  }

  Serial.println("[WiFi] Could not connect to any network!");
}

// ===== Sensor Reading =====
float readTemperatureSensor() {
  int rawValue = analogRead(TEMP_SENSOR_PIN);

  // Calibration formula (empirically tested)
  float temperature = (165.0 - rawValue) * 0.5 + 22.0;

  return temperature;
}

// ===== Calculate Average Temperature =====
float calculateAverage() {
  float sum = 0.0;
  int count = min(samplesCollected, SAMPLE_COUNT);

  for (int i = 0; i < count; i++) {
    sum += temperatureSamples[i];
  }

  float average = sum / count;

  Serial.print("[Average] ");
  Serial.print(count);
  Serial.print(" samples -> Temperature: ");
  Serial.print(average);
  Serial.println("°C");

  return average;
}

// ===== Read Light Sensor =====
int getLightPercentage() {
  int rawValue = analogRead(LIGHT_SENSOR_PIN);

  // Calibration for your environment
  int lightMin = 150;   // Brightest reading (sunlight)
  int lightMax = 900;   // Darkest reading (darkness)

  // Constrain to calibrated range
  rawValue = constrain(rawValue, lightMin, lightMax);

  // Map to 0-100%
  int lightPercent = map(rawValue, lightMin, lightMax, 100, 0);

  return lightPercent;
}

// ===== Send Data to Server =====
void sendDataToServer(float temperature, int light) {
  // Connect to server using direct IP
  Serial.print("[HTTP] Connecting to server: ");
  Serial.print(serverIP);
  Serial.print(":");
  Serial.println(serverPort);

  if (!client.connect(serverIP, serverPort)) {
    Serial.println("[HTTP] Connection failed!");
    Serial.println("[USB] Fallback: Sending data via USB...");
    sendDataViaUSB(temperature, light);
    return;
  }

  Serial.println("[HTTP] Connected, sending data...");

  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getISO8601Timestamp();
  doc["temperature"] = temperature;
  doc["light"] = light;

  // Serialize JSON to string
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print("[JSON] ");
  Serial.println(jsonPayload);

  // Create HTTP POST request
  String httpRequest = String("POST /api/readings HTTP/1.1\r\n") +
                       "Host: " + serverIP.toString() + ":" + serverPort + "\r\n" +
                       "Content-Type: application/json\r\n" +
                       "Content-Length: " + jsonPayload.length() + "\r\n" +
                       "Connection: close\r\n" +
                       "\r\n" +
                       jsonPayload;

  // Send request
  client.print(httpRequest);

  // Read response
  Serial.println("[HTTP] Waiting for response...");
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line.length() > 0) {
      Serial.print("[Response] ");
      Serial.println(line);
    }
  }

  client.stop();
  Serial.println("[HTTP] Disconnected\n");
}

// ===== USB Fallback =====
void sendDataViaUSB(float temperature, int light) {
  // Create JSON payload (same as HTTP)
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getISO8601Timestamp();
  doc["temperature"] = temperature;
  doc["light"] = light;

  // Serialize JSON
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send via Serial
  Serial.print("[USB_DATA] ");
  Serial.println(jsonPayload);
  Serial.println("[USB] Data sent via USB\n");
}

// ===== Helper Functions =====
String getISO8601Timestamp() {
  // Simple timestamp simulation
  // In production, use RTC module (DS3231) for accurate time
  unsigned long epochTime = 1716458400;  // 2026-05-23T12:00:00Z
  unsigned long adjustedTime = epochTime + (millis() / 1000);

  char timestamp[25];
  sprintf(timestamp, "2026-05-23T%02d:%02d:%02dZ",
          (millis() / 3600000) % 24,
          (millis() / 60000) % 60,
          (millis() / 1000) % 60);

  return String(timestamp);
}

void printWiFiStatus() {
  Serial.println("\n=== WiFi Status ===");
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Signal Strength (RSSI): ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
}
