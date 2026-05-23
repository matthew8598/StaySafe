/*
 * StaySafe - Arduino R4 WIFI sketch
 *
 * Posílá senzorová data na backend API
 * POST http://staysafe.local:3000/api/readings
 *
 * Automaticky descobuje backend přes mDNS
 * (Backend musí být publikován jako "staysafe.local")
 */

#include <WiFiS3.h>
#include <ArduinoJson.h>

// ===== WiFi Konfigurace =====
struct WiFiNetwork {
  const char* ssid;
  const char* password;
};

WiFiNetwork networks[] = {
  {"Vodafone-9EB4", "pMMbh47u7qdBbH6h"},
  {"T-920814", "phuchmdhbe4e"}
};
const int NETWORK_COUNT = sizeof(networks) / sizeof(networks[0]);

const char* serverHostname = "staysafe.local";  // mDNS hostname backendu
int serverPort = 3000;
IPAddress serverIP;                             // Bude vyřešen dynamicky

// ===== Device konfigurace =====
const int DEVICE_ID = 1;                   // Device ID z databáze
const int SEND_INTERVAL = 10000;           // Interval mezi odesláním (ms) = 10 sekund
const char* SENSOR_TYPE = "temperature";   // Typ senzoru: temperature, humidity, light

// ===== Piny senzorů (příklad) =====
const int TEMP_SENSOR_PIN = A0;            // Analog pin pro teplotní senzor
const int HUMIDITY_SENSOR_PIN = A1;        // Analog pin pro vlhkostní senzor
const int LIGHT_SENSOR_PIN = A2;           // Analog pin pro světelný senzor

unsigned long lastSendTime = 0;
unsigned long lastReadTime = 0;
WiFiClient client;

// Priemer z více měření
const int SAMPLE_COUNT = 10;  // Počet vzorků za sekundu
float temperatureSamples[SAMPLE_COUNT];
int sampleIndex = 0;
int samplesCollected = 0;

void setup() {
  Serial.begin(9600);
  delay(3000);  // Čekej, než se Serial inicializuje

  Serial.println("\n=== StaySafe Arduino R4 WIFI ===");
  Serial.println("Initializing...");

  // Inicializuj WiFi
  connectToWiFi();
}

void loop() {
  // Sbírání vzorků - čti senzor každých 100ms (10x za sekundu)
  if (millis() - lastReadTime >= 100) {
    lastReadTime = millis();

    // Přečti senzor a ulož do bufferu
    float temp = readTemperatureSensor();
    temperatureSamples[sampleIndex] = temp;
    sampleIndex = (sampleIndex + 1) % SAMPLE_COUNT;

    if (samplesCollected < SAMPLE_COUNT) {
      samplesCollected++;
    }
  }

  // Kontroluj, je-li čas poslat data (každých SEND_INTERVAL ms)
  if (millis() - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = millis();

    // Vypočítej průměr z posledních vzorků
    float averageTemp = calculateAverage();

    // Pošli průměr na server
    sendDataToServer(averageTemp);
  }

  // Měj WiFi připojení aktivní
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Připojení ztraceno! Reconnecting...");
    connectToWiFi();
  }
}

// ===== WiFi Funkce =====
void connectToWiFi() {
  for (int i = 0; i < NETWORK_COUNT; i++) {
    Serial.print("[WiFi] Pokus ");
    Serial.print(i + 1);
    Serial.print("/");
    Serial.print(NETWORK_COUNT);
    Serial.print(" - Připojuji se na: ");
    Serial.println(networks[i].ssid);

    WiFi.begin(networks[i].ssid, networks[i].password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n[WiFi] ✓ Připojeno!");
      Serial.print("[WiFi] SSID: ");
      Serial.println(networks[i].ssid);
      Serial.print("[WiFi] IP: ");
      Serial.println(WiFi.localIP());
      return;
    } else {
      Serial.println("\n[WiFi] ✗ Selhalo!");
      WiFi.end();
    }
  }

  Serial.println("[WiFi] ✗ Nepodařilo se připojit na žádnou síť!");
}

// ===== Čtení senzoru =====
float readTemperatureSensor() {
  // Senzor s inverzní polaritou
  // Kalibrováno empiricky: raw ~165 = 22°C
  // Malá změna raw = malá změna teploty (0.5°C na 1 raw)
  // Vzorec: temperature = (165 - rawValue) * 0.5 + 22

  int rawValue = analogRead(TEMP_SENSOR_PIN);

  // Lineární kalibrace
  float temperature = (165.0 - rawValue) * 0.5 + 22.0;

  return temperature;
}

// ===== Výpočet průměru =====
float calculateAverage() {
  float sum = 0.0;
  int count = min(samplesCollected, SAMPLE_COUNT);

  for (int i = 0; i < count; i++) {
    sum += temperatureSamples[i];
  }

  float average = sum / count;

  Serial.print("[Průměr] ");
  Serial.print(count);
  Serial.print(" vzorků -> Teplota: ");
  Serial.print(average);
  Serial.println("°C");

  return average;
}

// ===== Hostname resolution (mDNS) =====
bool resolveMDNSHostname() {
  // Pokus vyřešit hostname na IP adresu (DNS lookup)
  // WiFiS3 knihovna podporuje WiFi.hostByName() pro mDNS

  int attempts = 0;
  const int MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    if (WiFi.hostByName(serverHostname, serverIP)) {
      Serial.print("[mDNS] ✓ Vyřešeno! IP: ");
      Serial.println(serverIP);
      return true;
    }

    Serial.print("[mDNS] Pokus ");
    Serial.print(attempts + 1);
    Serial.print("/");
    Serial.println(MAX_ATTEMPTS);

    delay(500);
    attempts++;
  }

  return false;
}

// ===== Odesílání na server =====
void sendDataToServer(float sensorValue) {
  // Vyřeš hostname na IP adresu
  Serial.print("[mDNS] Hledám server: ");
  Serial.println(serverHostname);

  if (!resolveMDNSHostname()) {
    Serial.println("[HTTP] ✗ Nelze vyřešit hostname!");
    Serial.println("[USB] Fallback: Odesílám data přes USB na Mac...");
    sendDataViaUSB(sensorValue);
    return;
  }

  Serial.print("[HTTP] Připojuji se na server: ");
  Serial.print(serverIP);
  Serial.print(":");
  Serial.println(serverPort);

  if (!client.connect(serverIP, serverPort)) {
    Serial.println("[HTTP] ✗ Připojení selhalo!");
    Serial.println("[USB] Fallback: Odesílám data přes USB na Mac...");
    sendDataViaUSB(sensorValue);
    return;
  }

  Serial.println("[HTTP] ✓ Připojeno, odesílám data...");

  // Vytvoř JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getISO8601Timestamp();
  doc[SENSOR_TYPE] = sensorValue;

  // Serializuj JSON do stringu
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  Serial.print("[JSON] ");
  Serial.println(jsonPayload);

  // Vytvoř HTTP POST request
  String httpRequest = String("POST /api/readings HTTP/1.1\r\n") +
                       "Host: " + serverHostname + ":" + serverPort + "\r\n" +
                       "Content-Type: application/json\r\n" +
                       "Content-Length: " + jsonPayload.length() + "\r\n" +
                       "Connection: close\r\n" +
                       "\r\n" +
                       jsonPayload;

  // Pošli request
  client.print(httpRequest);

  // Přečti odpověď
  Serial.println("[HTTP] Čekám na odpověď...");
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line.length() > 0) {
      Serial.print("[Response] ");
      Serial.println(line);
    }
  }

  client.stop();
  Serial.println("[HTTP] ✓ Zařízení odpojeno\n");
}

// ===== Odesílání přes USB (fallback) =====
void sendDataViaUSB(float sensorValue) {
  // Vytvoř JSON payload (stejný jako pro HTTP)
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getISO8601Timestamp();
  doc[SENSOR_TYPE] = sensorValue;

  // Serializuj JSON do stringu
  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Pošli přes sériové rozhraní na Mac
  // Formát: [USB_DATA] <json>
  Serial.print("[USB_DATA] ");
  Serial.println(jsonPayload);
  Serial.println("[USB] ✓ Data odeslána přes USB\n");
}

// ===== Pomocné funkce =====
String getISO8601Timestamp() {
  // Vrátí aktuální čas v ISO8601 formátu
  // V produkci použij RTC modul (DS3231) pro přesný čas

  // Jednoduchá simulace: vrátí fixní čas (+ milisekundy)
  unsigned long epochTime = 1713607200;  // 2026-04-20T12:00:00Z
  unsigned long adjustedTime = epochTime + (millis() / 1000);

  // Převod na ISO8601 je komplexní, proto vrátíme jednoduše
  // V produkci použij knihovnu jako Time.h a RTC

  char timestamp[25];
  sprintf(timestamp, "2026-04-20T%02d:%02d:%02dZ",
          (millis() / 3600000) % 24,
          (millis() / 60000) % 60,
          (millis() / 1000) % 60);

  return String(timestamp);
}

// ===== Debug info =====
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
