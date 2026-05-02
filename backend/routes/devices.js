import express from "express";
import {
  dbInsertDevice,
  dbSelectAllDevices,
  dbSelectDevicesByUserId,
  dbSelectDeviceById,
  dbUpdateDevice,
  dbDeleteDevice,
  dbUpsertSensorControl,
} from "../db.js";
import { authenticate } from "../middleware/auth.js";
 
const router = express.Router();

router.use(authenticate);
 

const ALL_SENSORS = ["temperature", "humidity", "light"];

router.post("/", async (req, res) => {
  const { name, location, selectedSensors } = req.body;
  const user_id = req.user.id;
  const deviceName = name && name.trim() ? name.trim() : "My Device";
  const enabledSensors = Array.isArray(selectedSensors) ? selectedSensors : ALL_SENSORS;

  try {
    const existing = await dbSelectDevicesByUserId(user_id);
    if (existing.length > 0) {
      return res.status(409).json({ error: "This account already has a registered device." });
    }

    const id = await dbInsertDevice(user_id, deviceName, location ?? null);

    for (const sensorType of ALL_SENSORS) {
      const isEnabled = enabledSensors.includes(sensorType);
      await dbUpsertSensorControl(id, user_id, sensorType, isEnabled, null, null);
    }

    const device = await dbSelectDeviceById(id);
    return res.status(201).json(device);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error during device registration." });
  }
});
 

router.get("/", async (req, res) => {
  try {
    const rows = await dbSelectDevicesByUserId(req.user.id);
    return res.status(200).json({ total: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při načítání zařízení." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const device = await dbSelectDeviceById(req.params.id);
 
    if (!device) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }

    if (device.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
 
    return res.status(200).json(device);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru." });
  }
});
 

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, location, is_active } = req.body;
 
  if (!name && location === undefined && is_active === undefined) {
    return res.status(400).json({ error: "Není co aktualizovat." });
  }
 
  try {
    // Načteme aktuální stav aby chybějící pole zůstala nezměněna
    const existing = await dbSelectDeviceById(id);
    if (!existing) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
 
    const updated = await dbUpdateDevice(
      id,
      name ?? existing.name,
      location !== undefined ? location : existing.location,
      is_active !== undefined ? is_active : existing.is_active,
    );
 
    if (!updated) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }
 
    const device = await dbSelectDeviceById(id);
    return res.status(200).json(device);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při aktualizaci." });
  }
});
 



router.delete("/:id", async (req, res) => {
  try {
    const existing = await dbSelectDeviceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }

    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await dbDeleteDevice(req.params.id);
    return res.status(200).json({ message: "Zařízení bylo smazáno." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při mazání." });
  }
});
 
export default router;
 