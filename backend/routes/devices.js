import express from "express";
import {
  dbInsertDevice,
  dbSelectAllDevices,
  dbSelectDevicesByUserId,
  dbSelectDeviceById,
  dbUpdateDevice,
  dbDeleteDevice,
} from "../db.js";
 
const router = express.Router();
 

router.post("/", async (req, res) => {
  const { user_id, name, location } = req.body;
 
  if (!user_id || !name) {
    return res.status(400).json({
      error: "Chybějící povinná pole: user_id, name",
    });
  }
 
  try {
    const id = await dbInsertDevice(user_id, name, location);
    const device = await dbSelectDeviceById(id);
    return res.status(201).json(device);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při registraci zařízení." });
  }
});
 

router.get("/", async (req, res) => {
  const { user_id } = req.query;
 
  try {
    const rows = user_id
      ? await dbSelectDevicesByUserId(user_id)
      : await dbSelectAllDevices();
 
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
    const deleted = await dbDeleteDevice(req.params.id);
 
    if (!deleted) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }
 
    return res.status(200).json({ message: "Zařízení bylo smazáno." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při mazání." });
  }
});
 
export default router;
 