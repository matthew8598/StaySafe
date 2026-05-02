import {
  createAlert,
  listAlerts,
  getAlertById,
  removeAlert,
  resolveAlert,
} from "../dao/alertsDao.js";
import { listReadings } from "../dao/readingsDao.js";
import { dbSelectDeviceById } from "../db.js";

const DEFAULT_SEND_INTERVAL_MS = 10_000;
const OFFLINE_MULTIPLIER = 2;

function getConfiguredSendIntervalMs() {
  const configured = Number(process.env.DEVICE_SEND_INTERVAL_MS ?? process.env.ARDUINO_INTERVAL_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SEND_INTERVAL_MS;
}

function maybeBuildOfflineAlert(deviceId, latestReading) {
  if (!latestReading?.recordedAt) return null;

  const latestAtMs = new Date(latestReading.recordedAt).getTime();
  if (!Number.isFinite(latestAtMs)) return null;

  const timeoutMs = getConfiguredSendIntervalMs() * OFFLINE_MULTIPLIER;
  const nowMs = Date.now();
  const gapMs = nowMs - latestAtMs;

  if (gapMs <= timeoutMs) return null;

  const gapSeconds = Math.floor(gapMs / 1000);
  const timeoutSeconds = Math.floor(timeoutMs / 1000);

  return {
    id: `offline-${deviceId}`,
    deviceId,
    sensorType: "system",
    message: `No new sensor data for ${gapSeconds}s (offline threshold: ${timeoutSeconds}s).`,
    triggeredAt: new Date(latestAtMs + timeoutMs).toISOString(),
    isRead: false,
    isSynthetic: true,
    canResolve: false,
  };
}

// POST /api/alerts
export async function createAlertController(req, res) {
  try {
    const { deviceId, sensorType, message } = req.body;

    if (!deviceId || !sensorType || !message) {
      return res.status(400).json({
        message: "deviceId, sensorType and message are required",
      });
    }

    const device = await dbSelectDeviceById(Number(deviceId));
    if (!device) return res.status(404).json({ message: "Device not found" });
    if (device.user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    const newAlert = await createAlert({
      deviceId: Number(deviceId),
      sensorType,
      message,
    });

    return res.status(201).json(newAlert);
  } catch (error) {
    console.error("createAlertController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// GET /api/alerts
export async function listAlertsController(req, res) {
  try {
    const { deviceId, sensorType, isRead, from, to, limit } = req.query;

    if (!deviceId) {
      return res.status(400).json({ message: "deviceId query param is required" });
    }

    const device = await dbSelectDeviceById(Number(deviceId));
    if (!device) return res.status(404).json({ message: "Device not found" });
    if (device.user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    let parsedIsRead;
    if (isRead !== undefined) {
      if (isRead !== "true" && isRead !== "false") {
        return res.status(400).json({ message: "isRead must be true or false" });
      }
      parsedIsRead = isRead === "true";
    }

    const parsedLimit = limit ? Number(limit) : undefined;
    if (parsedLimit !== undefined && (!Number.isInteger(parsedLimit) || parsedLimit <= 0)) {
      return res.status(400).json({ message: "limit must be a positive integer" });
    }

    const wantsOffline = !sensorType || sensorType === "system" || sensorType === "offline";
    const shouldIncludeOffline = parsedIsRead !== true && wantsOffline;
    const daoLimit = shouldIncludeOffline && parsedLimit !== undefined
      ? parsedLimit + 1
      : parsedLimit;

    const alerts = await listAlerts({
      deviceId: Number(deviceId),
      sensorType,
      isRead: parsedIsRead,
      from,
      to,
      limit: daoLimit,
    });

    let mergedAlerts = alerts;
    if (shouldIncludeOffline) {
      const [latestReading] = await listReadings({ deviceId: Number(deviceId), limit: 1 });
      const offlineAlert = maybeBuildOfflineAlert(Number(deviceId), latestReading);
      if (offlineAlert) {
        mergedAlerts = [offlineAlert, ...alerts].sort(
          (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
        );
      }
    }

    if (parsedLimit !== undefined) {
      mergedAlerts = mergedAlerts.slice(0, parsedLimit);
    }

    return res.status(200).json(mergedAlerts);
  } catch (error) {
    console.error("listAlertsController error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/alerts/:id
export async function getAlertByIdController(req, res) {
  try {
    const { id } = req.params;

    const alert = await getAlertById(id);

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    const device = await dbSelectDeviceById(alert.deviceId);
    if (!device || device.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(alert);
  } catch (error) {
    console.error("getAlertByIdController error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// DELETE /api/alerts/:id
export async function removeAlertController(req, res) {
  try {
    const { id } = req.params;

    const alert = await getAlertById(id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    const device = await dbSelectDeviceById(alert.deviceId);
    if (!device || device.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await removeAlert(id);
    return res.status(200).json({ message: "Alert deleted successfully" });
  } catch (error) {
    console.error("removeAlertController error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/alerts/:id/resolve
export async function resolveAlertController(req, res) {
  try {
    const { id } = req.params;

    const alert = await getAlertById(id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    const device = await dbSelectDeviceById(alert.deviceId);
    if (!device || device.user_id !== req.user.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const resolved = await resolveAlert(id);
    return res.status(200).json(resolved);
  } catch (error) {
    console.error("resolveAlertController error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
