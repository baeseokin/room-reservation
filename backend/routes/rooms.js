const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/rooms/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });


// Middlewares for admin check
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.roles.includes("관리자")) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Admin permission required" });
  }
};

/**
 * List all rooms with their blocked times
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
    const [rooms] = await pool.query(query, params);
    
    // Fetch blocked times for all rooms
    const [blockedTimes] = await pool.query("SELECT * FROM room_blocked_times");
    
    // Attach blocked times to each room
    const roomsWithBlocked = rooms.map(room => ({
      ...room,
      blocked_times: blockedTimes.filter(bt => bt.room_id === room.id)
    }));
    
    res.json(roomsWithBlocked);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get blocked times for a specific room
 */
router.get("/:id/blocked-times", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM room_blocked_times WHERE room_id = ? ORDER BY day_of_week, start_time", [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Add a blocked time for a room
 */
router.post("/:id/blocked-times", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { recurring_type, day_of_week, day_of_month, nth_week, start_time, end_time, reason } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO room_blocked_times (room_id, recurring_type, day_of_week, day_of_month, nth_week, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [id, recurring_type || 'weekly', day_of_week, day_of_month, nth_week, start_time, end_time, reason]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Delete a blocked time
 */
router.delete("/blocked-times/:blockedId", isAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM room_blocked_times WHERE id = ?", [req.params.blockedId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Add a new room
 */
router.post("/", isAdmin, upload.single("image"), async (req, res) => {
  const { room_name, floor, dept_name, manager_name, manager_contact } = req.body;
  const image_url = req.file ? `/uploads/rooms/${req.file.filename}` : null;
  try {
    const [result] = await pool.query(
      "INSERT INTO rooms (room_name, floor, dept_name, manager_name, manager_contact, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [room_name, floor, dept_name, manager_name, manager_contact, image_url]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * Update a room
 */
router.put("/:id", isAdmin, upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { room_name, floor, dept_name, manager_name, manager_contact, remove_image } = req.body;
  
  try {
    let updateFields = "room_name = ?, floor = ?, dept_name = ?, manager_name = ?, manager_contact = ?";
    let params = [room_name, floor, dept_name, manager_name, manager_contact];

    if (req.file) {
      const image_url = `/uploads/rooms/${req.file.filename}`;
      updateFields += ", image_url = ?";
      params.push(image_url);
    } else if (remove_image === "true") {
      updateFields += ", image_url = NULL";
    }

    params.push(id);
    await pool.query(`UPDATE rooms SET ${updateFields} WHERE id = ?`, params);
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
