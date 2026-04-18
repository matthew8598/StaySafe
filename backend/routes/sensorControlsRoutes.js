import { Router } from "express";
import { listSensorControls, patchSensorControl } from "../controllers/sensorControlsController.js";

const router = Router();

// GET /api/controls?deviceId=1
router.get("/", listSensorControls);

// PATCH /api/controls/:deviceId/:sensorType
router.patch("/:deviceId/:sensorType", patchSensorControl);

export default router;
