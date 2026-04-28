const pool = require("./config/db");

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_blocked_times (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        day_of_week INT NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        reason VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("Table 'room_blocked_times' created successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Error creating table:", err);
    process.exit(1);
  }
}

setup();
