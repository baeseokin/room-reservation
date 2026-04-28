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

const isLogged = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ success: false, message: "Login required" });
  }
};

/**
 * Department Management
 */
router.get("/departments", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM departments ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/departments", isAdmin, async (req, res) => {
  const { dept_name, parent_dept_id } = req.body;
  try {
    await pool.query("INSERT INTO departments (dept_name, parent_dept_id) VALUES (?, ?)", [dept_name, parent_dept_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const bcrypt = require("bcrypt");

/**
 * Get current user profile
 */
router.get("/me", isLogged, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, user_id, user_name, email, phone, dept_name FROM users WHERE id = ?", [req.session.user.id]);
    if (rows.length === 0) return res.status(404).json({ success: false });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update current user profile
 */
router.put("/me", isLogged, async (req, res) => {
  const { user_name, email, phone, dept_name } = req.body;
  try {
    await pool.query(
      "UPDATE users SET user_name = ?, email = ?, phone = ?, dept_name = ? WHERE id = ?",
      [user_name, email, phone, dept_name, req.session.user.id]
    );
    
    // Update session info if needed
    req.session.user.userName = user_name;
    req.session.user.phone = phone;
    req.session.user.deptName = dept_name;
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * User Management
 */
router.get("/", isAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.*, GROUP_CONCAT(r.role_name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", isAdmin, async (req, res) => {
  const { user_id, user_name, email, phone, dept_name, password, roleIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password || "1234", saltRounds);

    // 2. Insert User
    const [result] = await conn.query(
      "INSERT INTO users (user_id, user_name, email, phone, dept_name, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, user_name, email, phone, dept_name, password_hash]
    );
    const newUserId = result.insertId;

    // 3. Assign Roles
    const finalRoleIds = (roleIds && roleIds.length > 0) ? roleIds : [2]; // Default to '사용자' (ID 2)
    const inserts = finalRoleIds.map(rid => [newUserId, rid]);
    await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [inserts]);

    await conn.commit();
    res.json({ success: true, id: newUserId });
  } catch (err) {
    await conn.rollback();
    console.error("Create User Error:", err);
    res.status(500).json({ success: false, message: err.code === 'ER_DUP_ENTRY' ? "이미 존재하는 아이디입니다." : err.message });
  } finally {
    conn.release();
  }
});

router.put("/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { user_name, email, phone, dept_name, roleIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Update basic info
    await conn.query(
      "UPDATE users SET user_name = ?, email = ?, phone = ?, dept_name = ? WHERE id = ?",
      [user_name, email, phone, dept_name, id]
    );

    // 2. Update roles if provided
    if (roleIds) {
      await conn.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
      if (roleIds.length > 0) {
        const inserts = roleIds.map(rid => [id, rid]);
        await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [inserts]);
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Update User Error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

router.delete("/:id", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user is deleting themselves
    if (req.session.user.id == id) {
       return res.status(400).json({ success: false, message: "본인 계정은 삭제할 수 없습니다." });
    }
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch("/:id/approve", isAdmin, async (req, res) => {
  const { id } = req.params;
  const { roleNames } = req.body; // Array of role names like ['사용자'] or ['관리자']
  
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Approve User
    await conn.query("UPDATE users SET is_approved = TRUE WHERE id = ?", [id]);

    // 2. Assign Roles if provided
    if (roleNames && roleNames.length > 0) {
      // Get role IDs
      const [roles] = await conn.query("SELECT id FROM roles WHERE role_name IN (?)", [roleNames]);
      if (roles.length > 0) {
        // Delete existing roles just in case
        await conn.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
        const inserts = roles.map(r => [id, r.id]);
        await conn.query("INSERT INTO user_roles (user_id, role_id) VALUES ?", [inserts]);
      }
    }

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error("Approve User Error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

router.post("/:id/reset-password", isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash("woncheon1234!", saltRounds);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, id]);
    res.json({ success: true, message: "비밀번호가 'woncheon1234!'로 초기화되었습니다." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
