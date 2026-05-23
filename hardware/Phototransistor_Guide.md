# Adding Phototransistor to StaySafe

Guide for integrating light sensor with existing temperature setup.

---

## Hardware Setup

### Phototransistor Overview

A phototransistor is a light-sensitive component that varies its resistance based on light intensity.

```
PIN CONFIGURATION:
┌─────┐
│  E  │  Emitter (shorter leg)
│  PT │  
│  C  │  Collector (longer leg)
└─────┘

Base is sensitive to light (middle of component)
```

---

## Wiring Diagram

### Current Setup (Temperature Only)
```
Arduino R4 WiFi
│
├─ Pin 5V ──────> LM35 Sensor (Pin 1)
├─ Pin A0 ──────> LM35 Sensor (Pin 2) - Temperature signal
├─ Pin GND ─────> LM35 Sensor (Pin 3)
└─ (Other pins available)
```

### With Phototransistor Added
```
Arduino R4 WiFi
│
├─ Pin 5V ──────┬──────> LM35 Sensor (Pin 1)
│               │
│               └──────> [10k Resistor] ──> [Phototransistor Collector]
│
├─ Pin A0 ─────────────> LM35 Sensor (Pin 2) - Temperature signal
│
├─ Pin A1 ─────────────> Junction (Resistor + Phototransistor) - Light signal
│
├─ Pin GND ─────┬──────> LM35 Sensor (Pin 3)
│               │
│               └──────> [Phototransistor Emitter]
│               │
│               └──────> [10k Resistor] (other end)
│
└─ (Other pins available)
```

---

## Component List

| Component | Value | Pin |
|-----------|-------|-----|
| Arduino R4 WiFi | - | - |
| LM35 Temperature Sensor | - | A0 |
| Phototransistor | 3-pin (L4A01) | A1 |
| Pull-down Resistor | 10k Ohm | Between PT and GND |
| Pull-up Resistor | 10k Ohm | Between 5V and A1 |

---

## Circuit Assembly

### Step 1: Identify Phototransistor Pins

```
Looking at the flat side of phototransistor:
┌─────────┐
│ ▯▯▯     │  Flat side
│  E   C  │  
└─────────┘
    B

E = Emitter (shorter leg)
B = Base (middle, light-sensitive)
C = Collector (longer leg)
```

### Step 2: Connect to Breadboard

```
5V Power Rail
    |
   [10k Resistor]
    |
    +─────────> (to A1 analog input)
    |
[Phototransistor Collector]
    |
[Phototransistor Emitter]
    |
   [10k Resistor]
    |
GND Ground Rail
```

### Step 3: Connect to Arduino

- **5V** → 5V Power Rail
- **GND** → GND Ground Rail
- **A1** → Wire from top of pull-up resistor (junction point)
- **A0** → LM35 Signal (existing)

---

## Arduino Code Integration

### Reading Raw Light Value

```cpp
const int LIGHT_SENSOR_PIN = A1;

void setup() {
  pinMode(LIGHT_SENSOR_PIN, INPUT);
}

void loop() {
  int lightRawValue = analogRead(LIGHT_SENSOR_PIN);
  // Value range: 0-1023
  // Low value = bright light
  // High value = dark/no light
  
  Serial.print("Light Raw: ");
  Serial.println(lightRawValue);
}
```

### Converting to Percentage

```cpp
int getLightPercentage() {
  int rawValue = analogRead(LIGHT_SENSOR_PIN);
  
  // Calibrate for your environment:
  // Set lightMin = darkest reading
  // Set lightMax = brightest reading
  int lightMin = 150;  // Bright sunlight
  int lightMax = 900;  // Complete darkness
  
  // Constrain value to calibrated range
  rawValue = constrain(rawValue, lightMin, lightMax);
  
  // Map to 0-100%
  int lightPercent = map(rawValue, lightMin, lightMax, 100, 0);
  
  return lightPercent;
}
```

### Integrating with Existing Code

Modify the `sendDataToServer()` function to include light data:

```cpp
void sendDataToServer() {
  // ... existing WiFi code ...
  
  float averageTemp = calculateAverage();
  int lightPercent = getLightPercentage();
  
  // Create JSON with both temperature and light
  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = getISO8601Timestamp();
  doc["temperature"] = averageTemp;
  doc["light"] = lightPercent;  // NEW
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  // ... rest of existing code ...
}
```

### Example Sensor Reading Loop

```cpp
// In main loop() function, add:

// Every 10 seconds, send both temperature and light
if (millis() - lastSendTime >= SEND_INTERVAL) {
  lastSendTime = millis();
  
  float averageTemp = calculateAverage();
  int lightLevel = getLightPercentage();
  
  Serial.print("[Sensors] Temp: ");
  Serial.print(averageTemp);
  Serial.print("°C | Light: ");
  Serial.print(lightLevel);
  Serial.println("%");
  
  sendDataToServer(averageTemp, lightLevel);
}
```

---

## Calibration

### Finding Your Min/Max Values

1. Upload this calibration sketch:

```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  int value = analogRead(A1);
  Serial.println(value);
  delay(100);
}
```

2. Run in different lighting conditions:
   - Bright sunlight: _____ (this is your lightMin)
   - Indoor bright light: _____
   - Indoor normal light: _____
   - Dark room: _____ (this is your lightMax)

3. Update your code with calibrated values:
```cpp
int lightMin = ???;  // Your brightest reading
int lightMax = ???;  // Your darkest reading
```

---

## Backend Integration

### Updating Arduino Sketch

Send light data in POST request:

```json
POST /api/readings HTTP/1.1
{
  "deviceId": 1,
  "timestamp": "2026-04-21T10:30:45Z",
  "temperature": 22.25,
  "light": 45
}
```

### Backend Receives

The backend should already accept this if `/api/readings` uses flexible JSON parsing:

```javascript
// Data automatically stored with:
// - sensor_type: "temperature", value: 22.25
// - sensor_type: "light", value: 45
```

---

## Testing

### Step 1: Check Serial Output

```
[Sensors] Temp: 22.5°C | Light: 45%
[Sensors] Temp: 22.4°C | Light: 52%
[Sensors] Temp: 22.6°C | Light: 40%
```

### Step 2: Cover Sensor

Hold hand over phototransistor → light percentage should increase

### Step 3: Expose to Light

Shine flashlight on it → light percentage should decrease

### Step 4: Verify Backend

Check database:
```sql
SELECT * FROM sensor_readings 
WHERE sensor_type IN ('temperature', 'light')
ORDER BY created_at DESC;
```

Should see both temperature and light readings.

---

## Troubleshooting

### Problem: Light values not changing

**Possible causes:**
- Phototransistor pins reversed
- Resistor value too high/low
- Sensor covered or blocked
- Wrong pin in code (A1 vs A0/A2)

**Solution:**
- Verify wiring matches diagram
- Try different resistor value (5k-20k range)
- Test in different lighting conditions
- Check Serial output to confirm values change

### Problem: Values always 0 or 1023

**Cause:** Resistor network issue

**Solution:**
- Check resistor connections
- Verify resistor is 10k (not 1k or 100k)
- Test with multimeter

### Problem: Backend shows light as "humidity"

**Cause:** Arduino is sending different sensor_type value

**Solution:**
- Ensure JSON field is labeled correctly
- Backend maps based on field name or sensor_type value
- Update backend to handle "light" sensor type if needed

---

## Summary

Adding phototransistor is straightforward:

1. Connect via A1 pin with pull-down resistor
2. Add `getLightPercentage()` function
3. Include light data in JSON payload
4. Calibrate for your environment
5. Backend receives as additional sensor type

Light sensor integrates seamlessly with existing temperature monitoring.
