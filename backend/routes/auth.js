const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");



/**
 * Check ID Duplication
 */
router.get("/check-id", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, message: "ID를 입력하세요." });

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE user_id = ?", [userId]);
    res.json({ success: true, available: existing.length === 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: "중복 체크 중 오류가 발생했습니다." });
  }
});

/**
 * Admin Login (ID + Password)
 * 관리자만 로그인 가능
 */
router.post("/login", async (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.status(400).json({ success: false, message: "ID와 비밀번호를 입력하세요." });

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    if (users.length === 0)
      return res.status(401).json({ success: false, message: "ID 또는 비밀번호가 올바르지 않습니다." });

    const user = users[0];



    // Check password
    if (!user.password_hash)
      return res.status(401).json({ success: false, message: "비밀번호가 설정되지 않은 계정입니다." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ success: false, message: "ID 또는 비밀번호가 올바르지 않습니다." });

    // Check roles
    const [userRoles] = await pool.query(
      "SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?",
      [user.id]
    );
    const roles = userRoles.map((r) => r.role_name);

    req.session.user = {
      id: user.id,
      userId: user.user_id,
      userName: user.user_name,
      email: user.email,
      phone: user.phone,
      deptName: user.dept_name,
      roles,
      mustChangePassword: !!user.must_change_password
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "로그인 중 오류가 발생했습니다." });
  }
});

/**
 * Get users by department (Public API for Login)
 */
router.get("/users-by-dept", async (req, res) => {
  const { deptName } = req.query;
  if (!deptName) return res.status(400).json({ success: false, message: "부서명을 입력하세요." });

  try {
    const [users] = await pool.query(
      "SELECT id, user_id, user_name FROM users WHERE dept_name = ? ORDER BY user_name ASC",
      [deptName]
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error("Fetch users by dept error:", error);
    res.status(500).json({ success: false, message: "사용자 목록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * Session check
 */
router.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, user: null });
  }
});

/**
 * Change Password
 */
router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const sessionUser = req.session.user;

  if (!sessionUser) return res.status(401).json({ success: false, message: "Login required" });
  if (!newPassword) return res.status(400).json({ success: false, message: "새 비밀번호를 입력하세요." });

  try {
    const [users] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [sessionUser.id]);
    if (users.length === 0) return res.status(404).json({ success: false });

    const user = users[0];
    
    // If they have a password, check it
    if (user.password_hash && currentPassword) {
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) return res.status(401).json({ success: false, message: "현재 비밀번호가 일치하지 않습니다." });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?", [hash, sessionUser.id]);
    
    // Update session
    req.session.user.mustChangePassword = false;
    
    res.json({ success: true, message: "비밀번호가 변경되었습니다." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "비밀번호 변경 중 오류가 발생했습니다." });
  }
});

/**
 * Logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
