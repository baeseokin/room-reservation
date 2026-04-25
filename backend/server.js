const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

const { envPick, envNumber, ENV } = require("./env");
const pool = require("./config/db");

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

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Health check
app.get("/health", (req, res) => res.send("OK"));

app.listen(PORT, () => {
  console.log(`🚀 Room Reservation Server running on port ${PORT}`);
});
