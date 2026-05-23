import { createReading, listReadings } from "../dao/readingsDao.js";
import { getSensorControl } from "../dao/sensorControlsDao.js";
import { createAlert, listAlerts } from "../dao/alertsDao.js";
import { dbSelectDeviceById } from "../db.js";

const VALID_SENSOR_TYPES = ["temperature", "light"];
const VALID_TIME_FIELDS = ["recordedAt", "createdAt"];

const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 35 },
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

async function getWindowAverages(deviceId, sensorType, currentAt, timeField = "recordedAt") {
  const currentDate = currentAt instanceof Date ? currentAt : new Date(currentAt);
  const currentAtMs = currentDate.getTime();
  const currentWindowStartMs = currentAtMs - AVERAGE_WINDOW_MS;
  const previousWindowStartMs = currentWindowStartMs - AVERAGE_WINDOW_MS;

  const readings = await listReadings({
    deviceId,
    sensorType,
    from: new Date(previousWindowStartMs).toISOString(),
    to: currentDate.toISOString(),
    timeField,
    sortBy: timeField,
  });

  const previousWindowValues = [];
  const currentWindowValues = [];

  readings.forEach((entry) => {
    const entryAtMs = new Date(entry[timeField]).getTime();
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

  if (!Number.isFinite(deviceId) || !timestamp) {
    return res.status(400).json({ error: "deviceId and timestamp are required" });
  }

  const sensorType = Object.keys(sensorFields).find((k) =>
    VALID_SENSOR_TYPES.includes(k),
  );

  if (!sensorType) {
    return res
      .status(400)
      .json({ error: `Body must contain one of: ${VALID_SENSOR_TYPES.join(", ")}` });
  }

  const value = sensorFields[sensorType];
  if (typeof value !== "number") {
    return res.status(400).json({ error: `${sensorType} must be a number` });
  }

  if (Number.isNaN(recordedAt.getTime())) {
    return res.status(400).json({ error: "timestamp is not a valid ISO date" });
  }

  const reading = await createReading({ deviceId, timestamp, [sensorType]: value });
  const alertReferenceAt = Number.isNaN(new Date(reading?.createdAt).getTime())
    ? recordedAt
    : new Date(reading.createdAt);

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
          sortBy: "createdAt",
        });

        if (streak.length === ALERT_STREAK_SIZE) {
          const sameDirectionStreak = streak.every((entry) => {
            const entryDirection = getViolationDirection(Number(entry.value), threshMin, threshMax);
            return entryDirection === currentDirection;
          });

          if (sameDirectionStreak) {
            const unresolved = await listAlerts({
              deviceId,
              sensorType,
              isRead: false,
              limit: 1,
            });

            if (unresolved.length === 0) {
              const threshold = currentDirection === "below" ? threshMin : threshMax;
              const directionText = currentDirection === "below" ? "below minimum" : "above maximum";
              await createAlert({
                deviceId,
                sensorType,
                message: `${sensorType} anomaly: ${ALERT_STREAK_SIZE} consecutive readings ${directionText} threshold (${threshold}). Latest value: ${value}.`,
              });
            }
          }
        }
      }

      const thresholdRange = threshMax - threshMin;
      if (thresholdRange > 0) {
        const averages = await getWindowAverages(deviceId, sensorType, alertReferenceAt, "createdAt");
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

  res.status(201).json(reading);
}

export async function getReadings(req, res) {
  const filters = {};
  if (req.query.deviceId) filters.deviceId = Number(req.query.deviceId);
  if (req.query.sensorType) filters.sensorType = req.query.sensorType;
  if (req.query.limit) filters.limit = Number(req.query.limit);
  if (req.query.offset) filters.offset = Number(req.query.offset);
  if (req.query.from) filters.from = req.query.from;
  if (req.query.to) filters.to = req.query.to;
  filters.timeField = req.query.timeField ?? "createdAt";
  filters.sortBy = req.query.sortBy ?? "createdAt";

  if (filters.limit !== undefined && (!Number.isInteger(filters.limit) || filters.limit <= 0)) {
    return res.status(400).json({ error: "limit must be a positive integer" });
  }

  if (filters.offset !== undefined && (!Number.isInteger(filters.offset) || filters.offset < 0)) {
    return res.status(400).json({ error: "offset must be a non-negative integer" });
  }

  if (filters.sensorType && !VALID_SENSOR_TYPES.includes(filters.sensorType)) {
    return res.status(400).json({ error: `sensorType must be one of: ${VALID_SENSOR_TYPES.join(", ")}` });
  }

  if (!VALID_TIME_FIELDS.includes(filters.timeField)) {
    return res.status(400).json({ error: `timeField must be one of: ${VALID_TIME_FIELDS.join(", ")}` });
  }

  if (!VALID_TIME_FIELDS.includes(filters.sortBy)) {
    return res.status(400).json({ error: `sortBy must be one of: ${VALID_TIME_FIELDS.join(", ")}` });
  }

  if (!filters.sensorType) {
    filters.sensorTypes = VALID_SENSOR_TYPES;
  }

  // Verify the device belongs to the authenticated user
  if (filters.deviceId) {
    const device = await dbSelectDeviceById(filters.deviceId);
    if (!device) return res.status(404).json({ error: "Device not found" });
    if (device.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  } else {
    return res.status(400).json({ error: "deviceId is required" });
  }

  const readings = await listReadings(filters);
  res.json(readings);
}