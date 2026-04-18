import {
  createAlert,
  listAlerts,
  getAlertById,
  removeAlert,
} from "../dao/alertsDao.js";

// POST /api/alerts
export async function createAlertController(req, res) {
  try {
    const { deviceId, sensorType, message } = req.body;

    if (!deviceId || !sensorType || !message) {
      return res.status(400).json({
        message: "deviceId, sensorType and message are required",
      });
    }

    const newAlert = await createAlert({
      deviceId,
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
    const { deviceId, sensorType } = req.query;

    const alerts = await listAlerts({
      deviceId,
      sensorType,
    });

    return res.status(200).json(alerts);
  } catch (error) {
    console.error("listAlertsController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// GET /api/alerts/:id
export async function getAlertByIdController(req, res) {
  try {
    const { id } = req.params;

    const alert = await getAlertById(id);

    if (!alert) {
      return res.status(404).json({
        message: "Alert not found",
      });
    }

    return res.status(200).json(alert);
  } catch (error) {
    console.error("getAlertByIdController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

// DELETE /api/alerts/:id
export async function removeAlertController(req, res) {
  try {
    const { id } = req.params;

    const removed = await removeAlert(id);

    if (!removed) {
      return res.status(404).json({
        message: "Alert not found",
      });
    }

    return res.status(200).json({
      message: "Alert deleted successfully",
    });
  } catch (error) {
    console.error("removeAlertController error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
