import { createReading, listReadings } from "../dao/readingsDao.js";
import { getSensorControl } from "../dao/sensorControlsDao.js";
import { createAlert, listAlerts } from "../dao/alertsDao.js";
import { dbSelectDeviceById } from "../db.js";

const VALID_SENSOR_TYPES = ["temperature", "humidity", "light"];

const DEFAULT_THRESHOLDS = {
  temperature: { min: 10, max: 35 },
  humidity:    { min: 20, max: 65 },
  light:       { min: 0,  max: 5  },
};

const ALERT_STREAK_SIZE = 3;

function getViolationDirection(value, min, max) {
  if (value < min) return "below";
  if (value > max) return "above";
  return null;
}

export async function postReading(req, res) {
  const { timestamp, ...sensorFields } = req.body;
  const deviceId = Number(req.body.deviceId);

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

  if (isNaN(Date.parse(timestamp))) {
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

    if (threshMin !== undefined && threshMax !== undefined) {
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

  if (filters.limit !== undefined && (!Number.isInteger(filters.limit) || filters.limit <= 0)) {
    return res.status(400).json({ error: "limit must be a positive integer" });
  }

  if (filters.offset !== undefined && (!Number.isInteger(filters.offset) || filters.offset < 0)) {
    return res.status(400).json({ error: "offset must be a non-negative integer" });
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
