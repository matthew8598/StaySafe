/*
 * StaySafe - Calibrated Sensor Test
 * For Arduino UNO R4 WiFi
 */

const int TEMP_SENSOR_PIN = A0;
const int LIGHT_SENSOR_PIN = A1;

// ADC config
const int ADC_BITS = 14;
const float ADC_MAX = 16383.0;   // 2^14 - 1
const float V_REF = 5.0;

// Sensor type: set to true for LM35, false for TMP36
const bool IS_LM35 = true;

// Averaging
const int NUM_SAMPLES = 16;

float readVoltage(int pin) {
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  float avg = sum / (float)NUM_SAMPLES;
  return avg * (V_REF / ADC_MAX);
}

float voltageToTempC(float v) {
  if (IS_LM35) {
    return v * 100.0;              // LM35: 10 mV/°C, no offset
  } else {
    return (v - 0.5) * 100.0;      // TMP36: 10 mV/°C with 500 mV offset
  }
}

// Convert light voltage to a 0–100 "brightness" percentage
float voltageToLightPct(float v) {
  return (v / V_REF) * 100.0;
}

void setup() {
  Serial.begin(9600);
  delay(2000);
  analogReadResolution(ADC_BITS);

  Serial.println("\n=== StaySafe Calibrated ===");
  Serial.print("Sensor type: ");
  Serial.println(IS_LM35 ? "LM35" : "TMP36");
  Serial.println();
}

void loop() {
  float tempV  = readVoltage(TEMP_SENSOR_PIN);
  float lightV = readVoltage(LIGHT_SENSOR_PIN);

  float tempC    = voltageToTempC(tempV);
  float lightPct = voltageToLightPct(lightV);

  Serial.print("Temp: ");
  Serial.print(tempC, 2);
  Serial.print(" °C (");
  Serial.print(tempV, 3);
  Serial.print(" V)  |  Light: ");
  Serial.print(lightPct, 1);
  Serial.print(" % (");
  Serial.print(lightV, 3);
  Serial.println(" V)");

  delay(500);
}