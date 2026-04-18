import { createReading, listReadings } from "../dao/readingsDao.js";

const VALID_SENSOR_TYPES = ["temperature", "humidity", "light"];

export async function postReading(req, res) {
  const { deviceId, timestamp, ...sensorFields } = req.body;

  if (!deviceId || !timestamp) {
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
  res.status(201).json(reading);
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
