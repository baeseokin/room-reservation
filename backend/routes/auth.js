const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../config/db");

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

    // Check admin role
    const [userRoles] = await pool.query(
      "SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?",
      [user.id]
    );
    const roles = userRoles.map((r) => r.role_name);

    if (!roles.includes("관리자"))
      return res.status(403).json({ success: false, message: "관리자만 로그인할 수 있습니다." });

    req.session.user = {
      id: user.id,
      userId: user.user_id,
      userName: user.user_name,
      email: user.email,
      phone: user.phone,
      roles,
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: "로그인 중 오류가 발생했습니다." });
  }
});

/**
 * Kakao OAuth Login
 */
const axios = require("axios");
router.post("/kakao", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false });

  try {
    // 1. Get Access Token
    const tokenRes = await axios.post("https://kauth.kakao.com/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_CLIENT_ID,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
        code
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const accessToken = tokenRes.data.access_token;

    // 2. Get User Info
    const userRes = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const kakaoUser = userRes.data;
    const kakaoId = String(kakaoUser.id);
    const userName = kakaoUser.kakao_account?.profile?.nickname || "사용자";

    // 3. Find or Create User
    const [existing] = await pool.query("SELECT * FROM users WHERE kakao_id = ?", [kakaoId]);
    let user;

    if (existing.length > 0) {
      user = existing[0];
    } else {
      // Create new user if not exists
      const [result] = await pool.query(
        "INSERT INTO users (user_id, user_name, kakao_id) VALUES (?, ?, ?)",
        [`kakao_${kakaoId}`, userName, kakaoId]
      );
      const newId = result.insertId;
      
      // Assign '사용자' role by default
      const [roleRows] = await pool.query("SELECT id FROM roles WHERE role_name = '사용자'");
      if (roleRows.length > 0) {
        await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [newId, roleRows[0].id]);
      }

      const [newUser] = await pool.query("SELECT * FROM users WHERE id = ?", [newId]);
      user = newUser[0];
    }

    // 4. Set Session
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
      roles,
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("Kakao login error:", err.response?.data || err.message);
    res.status(500).json({ success: false, message: "카카오 로그인 중 오류가 발생했습니다." });
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
 * Logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
