import { getAllSensorControls, getSensorControl, upsertSensorControl } from "../dao/sensorControlsDao.js";
import { dbSelectDeviceById } from "../db.js";

const PER_SENSOR_TYPES = ["temperature", "humidity", "light"];
const VALID_CONTROL_TYPES = [...PER_SENSOR_TYPES, "all"];

function parseThresholdValue(value, fieldName) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number, null, or omitted`);
  }
  return parsed;
}

// GET /api/controls?deviceId=1
export async function listSensorControls(req, res) {
  try {
    const deviceId = Number(req.query.deviceId);
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId query param is required" });
    }

    const device = await dbSelectDeviceById(deviceId);
    if (!device) return res.status(404).json({ message: "Device not found" });
    if (device.user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    const controls = await getAllSensorControls(deviceId);
    return res.json(controls);
  } catch (error) {
    console.error("listSensorControls error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// PATCH /api/controls/:deviceId/:sensorType
// Body: { isEnabled: boolean, userId?: number, thresholdMin?: number, thresholdMax?: number }
export async function patchSensorControl(req, res) {
  try {
    const deviceId = Number(req.params.deviceId);
    const { sensorType } = req.params;

    if (!VALID_CONTROL_TYPES.includes(sensorType)) {
      return res.status(400).json({ message: `sensorType must be one of: ${VALID_CONTROL_TYPES.join(", ")}` });
    }

    const device = await dbSelectDeviceById(deviceId);
    if (!device) return res.status(404).json({ message: "Device not found" });
    if (device.user_id !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    const { isEnabled, thresholdMin, thresholdMax } = req.body;
    const userId = req.user.id;
    const includesThresholdChange = thresholdMin !== undefined || thresholdMax !== undefined;

    if (isEnabled === undefined && !includesThresholdChange) {
      return res.status(400).json({
        message: "Provide at least one field: isEnabled, thresholdMin, or thresholdMax",
      });
    }

    if (sensorType === "all" && includesThresholdChange) {
      return res.status(400).json({
        message: "Global control (sensorType 'all') supports only isEnabled",
      });
    }

    if (isEnabled !== undefined && typeof isEnabled !== "boolean") {
      return res.status(400).json({ message: "isEnabled must be a boolean when provided" });
    }

    let parsedThresholdMin;
    let parsedThresholdMax;
    try {
      parsedThresholdMin = parseThresholdValue(thresholdMin, "thresholdMin");
      parsedThresholdMax = parseThresholdValue(thresholdMax, "thresholdMax");
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    const currentControl = await getSensorControl(deviceId, sensorType);
    const resolvedIsEnabled = isEnabled ?? currentControl?.isEnabled ?? true;
    const resolvedThresholdMin = sensorType === "all"
      ? null
      : (parsedThresholdMin !== undefined
        ? parsedThresholdMin
        : currentControl?.thresholdMin ?? null);
    const resolvedThresholdMax = sensorType === "all"
      ? null
      : (parsedThresholdMax !== undefined
        ? parsedThresholdMax
        : currentControl?.thresholdMax ?? null);

    if (
      sensorType !== "all"
      &&
      resolvedThresholdMin !== null
      && resolvedThresholdMax !== null
      && resolvedThresholdMin >= resolvedThresholdMax
    ) {
      return res.status(400).json({ message: "thresholdMin must be lower than thresholdMax" });
    }

    const control = await upsertSensorControl(
      deviceId,
      userId,
      sensorType,
      resolvedIsEnabled,
      resolvedThresholdMin,
      resolvedThresholdMax,
    );

    return res.json(control);
  } catch (error) {
    console.error("patchSensorControl error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
