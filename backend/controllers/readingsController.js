import { createReading, listReadings } from "../dao/readingsDao.js";
import { getSensorControl } from "../dao/sensorControlsDao.js";
import { createAlert } from "../dao/alertsDao.js";

const VALID_SENSOR_TYPES = ["temperature", "humidity", "light"];

const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 35 },
  humidity:    { min: 20, max: 65 },
  light:       { min: 0,  max: 5  },
};

const ALERT_STREAK_SIZE = 3;
const AVERAGE_WINDOW_MS = 10_000;
const SUDDEN_CHANGE_RANGE_FACTOR = 0.2;

function getViolationDirection(value, min, max) {
  if (value < min) return "below";
  if (value > max) return "above";
  return null;
}

function calculateAverage(values) {
  return values.reduce((sum, entry) => sum + entry, 0) / values.length;
}

async function getWindowAverages(deviceId, sensorType, recordedAt) {
  const currentAtMs = recordedAt.getTime();
  const currentWindowStartMs = currentAtMs - AVERAGE_WINDOW_MS;
  const previousWindowStartMs = currentWindowStartMs - AVERAGE_WINDOW_MS;

  const readings = await listReadings({
    deviceId,
    sensorType,
    from: new Date(previousWindowStartMs).toISOString(),
    to: recordedAt.toISOString(),
  });

  const previousWindowValues = [];
  const currentWindowValues = [];

  readings.forEach((entry) => {
    const entryAtMs = new Date(entry.recordedAt).getTime();
    const numericValue = Number(entry.value);

    if (!Number.isFinite(entryAtMs) || !Number.isFinite(numericValue)) {
      return;
    }

    if (entryAtMs >= currentWindowStartMs) {
      currentWindowValues.push(numericValue);
      return;
    }

    if (entryAtMs >= previousWindowStartMs) {
      previousWindowValues.push(numericValue);
    }
  });

  if (previousWindowValues.length === 0 || currentWindowValues.length === 0) {
    return null;
  }

  return {
    previousAverage: calculateAverage(previousWindowValues),
    currentAverage: calculateAverage(currentWindowValues),
  };
}

export async function postReading(req, res) {
  const { timestamp, ...sensorFields } = req.body;
  const deviceId = Number(req.body.deviceId);
  const recordedAt = new Date(timestamp);

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

  if (Number.isNaN(recordedAt.getTime())) {
    return res.status(400).json({ error: "timestamp is not a valid ISO date" });
  }

  const reading = await createReading({ deviceId, timestamp, [sensorType]: value });

  // ── Alert check ──────────────────────────────────────────────────────────
  const [globalControl, control] = await Promise.all([
    getSensorControl(deviceId, "all"),
    getSensorControl(deviceId, sensorType),
  ]);
  const isGlobalEnabled = globalControl?.isEnabled ?? true;
  const isSensorEnabled = control?.isEnabled ?? true;

  if (isGlobalEnabled && isSensorEnabled) {
    const threshMin = control?.thresholdMin ?? DEFAULT_THRESHOLDS[sensorType]?.min;
    const threshMax = control?.thresholdMax ?? DEFAULT_THRESHOLDS[sensorType]?.max;

    if (Number.isFinite(threshMin) && Number.isFinite(threshMax)) {
      const currentDirection = getViolationDirection(value, threshMin, threshMax);
      if (currentDirection) {
        const streak = await listReadings({
          deviceId,
          sensorType,
          limit: ALERT_STREAK_SIZE,
        });

        if (streak.length === ALERT_STREAK_SIZE) {
          const sameDirectionStreak = streak.every((entry) => {
            const entryDirection = getViolationDirection(Number(entry.value), threshMin, threshMax);
            return entryDirection === currentDirection;
          });

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

      const thresholdRange = threshMax - threshMin;
      if (thresholdRange > 0) {
        const averages = await getWindowAverages(deviceId, sensorType, recordedAt);
        if (averages) {
          const averageDelta = Math.abs(averages.currentAverage - averages.previousAverage);
          const suddenChangeLimit = thresholdRange * SUDDEN_CHANGE_RANGE_FACTOR;

          if (averageDelta >= suddenChangeLimit) {
            const unresolved = await listAlerts({
              deviceId,
              sensorType,
              isRead: false,
              limit: 1,
            });

            if (unresolved.length === 0) {
              await createAlert({
                deviceId,
                sensorType,
                message: `${sensorType} sudden change: 10s average moved from ${averages.previousAverage.toFixed(2)} to ${averages.currentAverage.toFixed(2)} (delta ${averageDelta.toFixed(2)}), exceeding 20% of threshold range (${suddenChangeLimit.toFixed(2)}).`,
              });
            }
          }
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
