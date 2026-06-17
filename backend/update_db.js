const pool = require('./config/db');

async function main() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM reservation_policies LIKE 'max_booking_months'");
    if (rows.length === 0) {
      await pool.query("ALTER TABLE reservation_policies ADD COLUMN max_booking_months INT NOT NULL DEFAULT 1");
      console.log("Column max_booking_months added.");
    } else {
      console.log("Column max_booking_months already exists.");
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
