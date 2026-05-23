import { createReading, listReadings } from "../dao/readingsDao.js";
import { getSensorControl } from "../dao/sensorControlsDao.js";
import { createAlert } from "../dao/alertsDao.js";

const VALID_SENSOR_TYPES = ["temperature", "humidity", "light"];

const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 35 },
  humidity:    { min: 20, max: 65 },
  light:       { min: 0,  max: 5  },
};

export async function postReading(req, res) {
  const { deviceId, timestamp, ...sensorFields } = req.body;

  if (!deviceId || !timestamp) {
    return res.status(400).json({ error: "deviceId and timestamp are required" });
  }

  if (isNaN(Date.parse(timestamp))) {
    return res.status(400).json({ error: "timestamp is not a valid ISO date" });
  }

  // Extract ALL sensor types from request (not just the first one)
  const sensorTypes = Object.keys(sensorFields).filter((k) =>
    VALID_SENSOR_TYPES.includes(k),
  );

  if (sensorTypes.length === 0) {
    return res
      .status(400)
      .json({ error: `Body must contain one of: ${VALID_SENSOR_TYPES.join(", ")}` });
  }

  // Process each sensor type and create separate readings
  const readings = [];

  for (const sensorType of sensorTypes) {
    const value = sensorFields[sensorType];

    if (typeof value !== "number") {
      return res.status(400).json({ error: `${sensorType} must be a number` });
    }

    const reading = await createReading({ deviceId, timestamp, [sensorType]: value });
    readings.push(reading);

    // ── Alert check ──────────────────────────────────────────────────────────
    const control = await getSensorControl(deviceId, sensorType);

    if (!control || control.isEnabled) {
      const threshMin = control?.thresholdMin ?? DEFAULT_THRESHOLDS[sensorType]?.min;
      const threshMax = control?.thresholdMax ?? DEFAULT_THRESHOLDS[sensorType]?.max;

      if (threshMin !== undefined && threshMax !== undefined) {
        if (value < threshMin || value > threshMax) {
          const direction = value < threshMin ? "below minimum" : "above maximum";
          const threshold = value < threshMin ? threshMin : threshMax;
          await createAlert({
            deviceId,
            sensorType,
            message: `${sensorType} value ${value} is ${direction} threshold (${threshold})`,
          });
        }
      }
    }
  }

  // Return all created readings
  res.status(201).json(readings.length === 1 ? readings[0] : readings);
}

export async function getReadings(req, res) {
  const filters = {};
  if (req.query.deviceId) filters.deviceId = Number(req.query.deviceId);
  if (req.query.sensorType) filters.sensorType = req.query.sensorType;
  if (req.query.limit) filters.limit = Number(req.query.limit);
  if (req.query.from) filters.from = req.query.from;
  if (req.query.to) filters.to = req.query.to;

  const readings = await listReadings(filters);
  res.json(readings);
}
