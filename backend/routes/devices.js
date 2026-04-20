import express from 'express';
import db from '../db.js';

const router = express.Router();

// Registrace nového zařízení
router.post("/", async (req, res) => {
  const { user_id, name, location } = req.body;
 
  if (!user_id || !name) {
    return res.status(400).json({
      error: "Chybějící povinná pole: user_id, name",
    });
  }
 
  try {
    const [result] = await db.execute(
      "INSERT INTO devices (user_id, name, location, is_active) VALUES (?, ?, ?, 1)",
      [user_id, name, location ?? null]
    );
 
    const [rows] = await db.execute(
      "SELECT * FROM devices WHERE id = ?",
      [result.insertId]
    );
 
    return res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při registraci zařízení." });
  }
});

//Získání seznamu všech zařízení

router.get("/", async (req, res) => {
    const { user_id } = req.query;

    try {
        let query = "SELECT * FROM devices";
        const params = [];

        if (user_id) {
      query += " WHERE user_id = ?";
      params.push(user_id);
    }
 
    query += " ORDER BY created_at DESC";
 
    const [rows] = await db.execute(query, params);
    return res.status(200).json({ total: rows.length, data: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při načítání zařízení." });
  }
});

//Získání jednoho zařízení dle ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
 
  try {
    const [rows] = await db.execute(
      "SELECT * FROM devices WHERE id = ?",
      [id]
    );
 
    if (rows.length === 0) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }
 
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru." });
  }
});


//Aktualizace zařízení (název, lokace, is_active)
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, location, is_active } = req.body;
 
  if (!name && location === undefined && is_active === undefined) {
    return res.status(400).json({ error: "Není co aktualizovat." });
  }
 
  try {
    const fields = [];
    const params = [];
 
    if (name) { fields.push("name = ?"); params.push(name); }
    if (location !== undefined) { fields.push("location = ?"); params.push(location); }
    if (is_active !== undefined) { fields.push("is_active = ?"); params.push(is_active ? 1 : 0); }
 
    params.push(id);
 
    const [result] = await db.execute(
      `UPDATE devices SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      params
    );
 
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }
 
    const [rows] = await db.execute("SELECT * FROM devices WHERE id = ?", [id]);
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při aktualizaci." });
  }
});
 

//Smazání zařízení
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
 
  try {
    const [result] = await db.execute(
      "DELETE FROM devices WHERE id = ?",
      [id]
    );
 
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Zařízení nenalezeno." });
    }
 
    return res.status(200).json({ message: "Zařízení bylo smazáno." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Chyba serveru při mazání." });
  }
});
 
export default router;