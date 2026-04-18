import { Router } from "express";
import { postReading, getReadings } from "../controllers/readingsController.js";

const router = Router();

// POST /api/readings  — Arduino sends sensor data
router.post("/", postReading);

// GET  /api/readings?deviceId=1&sensorType=temperature
router.get("/", getReadings);

export default router;
