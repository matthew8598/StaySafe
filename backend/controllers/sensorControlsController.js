import { getAllSensorControls, upsertSensorControl } from "../dao/sensorControlsDao.js";

const VALID_SENSOR_TYPES = ["temperature", "humidity", "light"];

// GET /api/controls?deviceId=1
export async function listSensorControls(req, res) {
  try {
    const deviceId = Number(req.query.deviceId);
    if (!deviceId) {
      return res.status(400).json({ message: "deviceId query param is required" });
    }
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

    if (!VALID_SENSOR_TYPES.includes(sensorType)) {
      return res.status(400).json({ message: `sensorType must be one of: ${VALID_SENSOR_TYPES.join(", ")}` });
    }

    const { isEnabled, userId = 1, thresholdMin, thresholdMax } = req.body;

    if (typeof isEnabled !== "boolean") {
      return res.status(400).json({ message: "isEnabled (boolean) is required" });
    }

    const control = await upsertSensorControl(
      deviceId,
      userId,
      sensorType,
      isEnabled,
      thresholdMin ?? null,
      thresholdMax ?? null,
    );

    return res.json(control);
  } catch (error) {
    console.error("patchSensorControl error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
