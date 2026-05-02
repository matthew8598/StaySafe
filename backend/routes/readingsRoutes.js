import { Router } from "express";
import { postReading, getReadings } from "../controllers/readingsController.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// POST /api/readings  — Arduino sends sensor data (no auth, device key not yet implemented)
router.post("/", postReading);

// GET  /api/readings?deviceId=1&sensorType=temperature
router.get("/", authenticate, getReadings);

export default router;
