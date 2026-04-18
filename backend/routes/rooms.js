const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Middlewares for admin check
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.roles.includes("관리자")) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin permission required" });
  }
};

/**
 * List all rooms
 */
router.get("/", async (req, res) => {
  try {
    const { floor } = req.query;
    let query = "SELECT * FROM rooms";
    const params = [];
    if (floor) {
      query += " WHERE floor = ?";
      params.push(floor);
    }
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Add a new room
 */
router.post("/", isAdmin, async (req, res) => {
  const { room_name, floor, dept_name, manager_name, manager_contact } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO rooms (room_name, floor, dept_name, manager_name, manager_contact) VALUES (?, ?, ?, ?, ?)",
      [room_name, floor, dept_name, manager_name, manager_contact]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update a room
 */
router.put("/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { room_name, floor, dept_name, manager_name, manager_contact } = req.body;
  try {
    await pool.query(
      "UPDATE rooms SET room_name = ?, floor = ?, dept_name = ?, manager_name = ?, manager_contact = ? WHERE id = ?",
      [room_name, floor, dept_name, manager_name, manager_contact, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete a room
 */
router.delete("/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM rooms WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
