import { SENSOR_CONFIG } from "./shared.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const SENSOR_TYPES = ["temperature", "humidity", "light"];

// Simple seeded random walk per sensor so values look realistic
const state = {
  temperature: 22.5,
  humidity: 47,
  light: 0,
};

function nextValue(sensorType) {
  const cfg = SENSOR_CONFIG[sensorType];

  if (sensorType === "light") {
    // Mostly 0 (safe closed), occasional spike simulates intrusion
    state.light = Math.random() < 0.06
      ? parseFloat((Math.random() * 90 + 8).toFixed(1))
      : 0;
  } else {
    state[sensorType] += (Math.random() - 0.5) * cfg.variance * 0.25;
    state[sensorType] = parseFloat(
      Math.max(
        cfg.base - cfg.variance,
        Math.min(cfg.base + cfg.variance, state[sensorType]),
      ).toFixed(1),
    );
  }

  return state[sensorType];
}

/**
 * Starts the Arduino mock. Cycles through sensor types on each tick and POSTs
 * a reading to the backend just as a real Arduino would.
 *
 * @param {number} deviceId   - The device_id assigned to this mock Arduino
 * @param {number} intervalMs - How often to send a reading (ms). Default 5 000.
 * @returns {() => void}      - Call the returned function to stop the mock.
 */
export function startArduinoMock(deviceId = 1, intervalMs = 5_000) {
  let typeIndex = 0;

  async function sendReading() {
    const sensorType = SENSOR_TYPES[typeIndex % SENSOR_TYPES.length];
    typeIndex++;

    const payload = {
      deviceId,
      [sensorType]: nextValue(sensorType),
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${BASE_URL}/readings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json();
        console.log(
          `[ArduinoMock] ✓ ${sensorType} = ${payload[sensorType]} ${SENSOR_CONFIG[sensorType].unit}`,
          saved,
        );
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn(`[ArduinoMock] ✗ ${sensorType}`, res.status, err);
      }
    } catch (e) {
      console.warn("[ArduinoMock] network error", e.message);
    }
  }

  // Send one immediately, then on every interval
  sendReading();
  const id = setInterval(sendReading, intervalMs);

  console.log(
    `[ArduinoMock] started — deviceId=${deviceId}, interval=${intervalMs}ms`,
  );

  return () => {
    clearInterval(id);
    console.log("[ArduinoMock] stopped");
  };
}
