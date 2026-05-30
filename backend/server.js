const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const { envPick, envNumber, ENV } = require("./env");
const pool = require("./config/db");

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reservation_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        allow_same_day TINYINT(1) NOT NULL DEFAULT 0,
        allow_monday TINYINT(1) NOT NULL DEFAULT 0,
        allow_holidays TINYINT(1) NOT NULL DEFAULT 0,
        start_time TIME NOT NULL DEFAULT '09:00:00',
        end_time TIME NOT NULL DEFAULT '17:00:00',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    const [rows] = await pool.query("SELECT * FROM reservation_policies WHERE id = 1");
    if (rows.length === 0) {
      await pool.query(`
        INSERT INTO reservation_policies (id, allow_same_day, allow_monday, allow_holidays, start_time, end_time)
        VALUES (1, 0, 0, 0, '09:00:00', '17:00:00');
      `);
      console.log("Initialized default reservation policy.");
    }
  } catch (err) {
    console.error("DB Initialization Error:", err);
  }
};
initDb();

const app = express();
const PORT = envNumber("PORT", 3002); // Using 3002 for Room Reservation

// CORS setup
const allowedOrigins = (envPick("CORS_ORIGIN", "") || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed: " + origin));
    }
  },
  credentials: true
}));

app.use(bodyParser.json());
if (ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  session({
    secret: envPick("SESSION_SECRET", "room-secret-key"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: "auto",
      sameSite: "lax"
    }
  })
);

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const roomRoutes = require("./routes/rooms");
const reservationRoutes = require("./routes/reservations");
const departmentRoutes = require("./routes/departments");
const adminRoutes = require("./routes/admins");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/admins", adminRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Health check
app.get("/health", (req, res) => res.send("OK"));

app.listen(PORT, () => {
  console.log(`🚀 Room Reservation Server running on port ${PORT}`);
});
