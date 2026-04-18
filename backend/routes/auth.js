const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../config/db");
const { envPick } = require("../env");

/**
 * Simple Login (For interim/dev)
 */
router.post("/login", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

  try {
    let [users] = await pool.query("SELECT * FROM users WHERE user_id = ?", [userId]);
    let user;

    if (users.length === 0) {
      // Create a test user if not found
      const [result] = await pool.query(
        "INSERT INTO users (user_id, user_name, email, phone) VALUES (?, ?, ?, ?)",
        [userId, `${userId}_user`, `${userId}@example.com`, "010-0000-0000"]
      );
      const [newUsers] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = newUsers[0];

      // Default role
      const [roles] = await pool.query("SELECT id FROM roles WHERE role_name = '사용자'");
      if (roles.length > 0) {
        await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [user.id, roles[0].id]);
      }
    } else {
      user = users[0];
    }

    const [userRoles] = await pool.query(
      "SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?",
      [user.id]
    );

    req.session.user = {
      id: user.id,
      userId: user.user_id,
      userName: user.user_name,
      email: user.email,
      phone: user.phone,
      deptName: user.dept_name,
      roles: userRoles.map((r) => r.role_name),
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error("Simple login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

/**
 * Kakao Login Flow
 */
router.post("/kakao/login", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: "Code is required" });

  try {
    // 1. Get Access Token
    const tokenResponse = await axios.post("https://kauth.kakao.com/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        client_id: envPick("KAKAO_CLIENT_ID"),
        redirect_uri: envPick("KAKAO_REDIRECT_URI"),
        code: code,
      },
      headers: { "Content-type": "application/x-www-form-urlencoded;charset=utf-8" },
    });

    const accessToken = tokenResponse.data.access_token;

    // 2. Get User Info
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    const kakaoUser = userResponse.data;
    const kakaoId = String(kakaoUser.id);
    const nickname = kakaoUser.properties?.nickname || "Kakao User";
    const email = kakaoUser.kakao_account?.email || "";

    // 3. Find or Create User in DB
    let [users] = await pool.query("SELECT * FROM users WHERE kakao_id = ?", [kakaoId]);
    let user;

    if (users.length === 0) {
      // First time login - Create user
      const [result] = await pool.query(
        "INSERT INTO users (user_id, user_name, email, kakao_id) VALUES (?, ?, ?, ?)",
        [`kakao_${kakaoId}`, nickname, email, kakaoId]
      );
      const [newUsers] = await pool.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
      user = newUsers[0];
      
      // Assign default '사용자' role
      const [roles] = await pool.query("SELECT id FROM roles WHERE role_name = '사용자'");
      if (roles.length > 0) {
        await pool.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [user.id, roles[0].id]);
      }
    } else {
      user = users[0];
    }

    // 4. Set Session
    const [userRoles] = await pool.query(
      "SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?",
      [user.id]
    );

    req.session.user = {
      id: user.id,
      userId: user.user_id,
      userName: user.user_name,
      email: user.email,
      phone: user.phone,
      deptName: user.dept_name,
      roles: userRoles.map(r => r.role_name),
    };

    res.json({ success: true, user: req.session.user });
  } catch (error) {
    console.error("Kakao login error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "Kakao login failed" });
  }
});

router.get("/session", (req, res) => {
  if (req.session.user) {
    res.json({ success: true, user: req.session.user });
  } else {
    res.json({ success: false, user: null });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;
