const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { sendNewReservationToAdmin, sendApprovalAlimTalk, sendRejectionAlimTalk, sendInquiryAlimTalk } = require("../services/alimtalk");

// Auth check middleware
const isLogged = (req, res, next) => {
  if (req.session.user) return next();
  res.status(401).json({ success: false, message: "Login required" });
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.roles.includes("관리자")) return next();
  res.status(403).json({ success: false, message: "Admin permission required" });
};

/**
 * List reservations (filter by date range, room, user)
 */
router.get("/", async (req, res) => {
  const { date, start_date, end_date, room_id, user_id, status } = req.query;
  try {
    let query = `
      SELECT r.*, rm.room_name, rm.floor, rm.image_url 
      FROM reservations r 
      JOIN rooms rm ON r.room_id = rm.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      query += " AND r.status = ?";
      params.push(status);
    } else if (status === 'all') {
      // 'all' means everything including cancelled
    } else {
      // Default: don't show cancelled (for public grid view)
      query += " AND r.status != 'cancelled'";
    }

    if (date) {
      query += " AND r.reservation_date = ?";
      params.push(date);
    } else if (start_date && end_date) {
      query += " AND r.reservation_date BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    if (room_id) {
      query += " AND r.room_id = ?";
      params.push(room_id);
    }
    if (user_id) {
      query += " AND r.requester_id = ?";
      params.push(user_id);
    }

    query += " ORDER BY r.reservation_date DESC, r.start_time DESC";
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Reservations API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create Reservation (No login required — public)
 * Status defaults to 'pending' (대기중), admin must approve
 */
router.post("/", async (req, res) => {
  const { 
    room_id, 
    reservation_date, 
    start_time, 
    end_time, 
    reason, 
    is_recurring, 
    recurring_type,
    recurring_end_date,
    requester_name,
    requester_phone,
    title
  } = req.body;

  // requester_id is optional (no login required)
  const requester_id = req.session?.user?.id || null;
  const conn = await pool.getConnection();


  try {
    await conn.beginTransaction();

    // 1. Conflict check against 'approved' and 'pending' reservations
    const [conflicts] = await conn.query(
      `SELECT * FROM reservations 
       WHERE room_id = ? AND reservation_date = ? AND status IN ('approved', 'pending')
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
      [room_id, reservation_date, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (conflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({ 
        success: false,         message: "이미 해당 시간에 승인되었거나 대기 중인 예약이 있습니다.",
        conflicts 
      });
    }

    // 1b. Check against room_blocked_times
    const d = new Date(reservation_date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const dayOfMonth = d.getDate();
    const nthWeek = Math.ceil(dayOfMonth / 7);

    const [blockedConflicts] = await conn.query(
      `SELECT * FROM room_blocked_times
       WHERE room_id = ?
       AND (
         (recurring_type = 'weekly' AND day_of_week = ?) OR
         (recurring_type = 'monthly_date' AND day_of_month = ?) OR
         (recurring_type = 'monthly_nth' AND nth_week = ? AND day_of_week = ?)
       )
       AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
      [room_id, dayOfWeek, dayOfMonth, nthWeek, dayOfWeek, start_time, start_time, end_time, end_time, start_time, end_time]
    );

    if (blockedConflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: "해당 시간은 공간 관리자에 의해 예약이 불가한 시간으로 설정되어 있습니다.",
        reason: blockedConflicts[0].reason
      });
    }

    // 2. Insert Reservation(s)
    let reservationIds = [];
    if (is_recurring) {
      const { 
        recurring_days, 
        recurring_month_option, 
        recurring_month_date, 
        recurring_month_nth_week, 
        recurring_month_nth_day 
      } = req.body;

      let currentD = new Date(reservation_date + 'T00:00:00');
      
      // Fallback for end date if missing (legacy support or missing input)
      let endD;
      if (recurring_end_date) {
        endD = new Date(recurring_end_date + 'T00:00:00');
      } else {
        // Default to 4 weeks if not specified
        endD = new Date(currentD);
        endD.setDate(endD.getDate() + 28);
      }

      let count = 0;
      const MAX_RECURRENCE = 365;

      console.log(`Starting recurrence loop: type=${recurring_type}, start=${reservation_date}, end=${endD.toLocaleDateString()}`);

      while (currentD <= endD && count < MAX_RECURRENCE) {
        // Check if currentD matches the pattern
        let matches = false;
        if (recurring_type === 'daily') {
          matches = true;
        } else if (recurring_type === 'weekly') {
          if (Array.isArray(recurring_days) && recurring_days.length > 0) {
            matches = recurring_days.includes(currentD.getDay());
          } else {
            // Fallback to start date's day of week
            const startDay = new Date(reservation_date + 'T00:00:00').getDay();
            matches = currentD.getDay() === startDay;
          }
        } else if (recurring_type === 'monthly') {
          if (recurring_month_option === 'date') {
            matches = currentD.getDate() === parseInt(recurring_month_date);
          } else if (recurring_month_option === 'nth') {
            const day = currentD.getDate();
            const week = Math.ceil(day / 7);
            matches = (week === parseInt(recurring_month_nth_week) && currentD.getDay() === parseInt(recurring_month_nth_day));
          } else {
            // Legacy monthly: matches start date's day of month
            const startDate = new Date(reservation_date + 'T00:00:00').getDate();
            matches = currentD.getDate() === startDate;
          }
        }

        if (matches) {
          // Robust YYYY-MM-DD formatting in local time
          const dateStr = [
            currentD.getFullYear(),
            String(currentD.getMonth() + 1).padStart(2, '0'),
            String(currentD.getDate()).padStart(2, '0')
          ].join('-');

          // Individual occurrence conflict check
          const [rConflicts] = await conn.query(
            `SELECT id FROM reservations 
             WHERE room_id = ? AND reservation_date = ? AND status IN ('approved', 'pending')
             AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
            [room_id, dateStr, start_time, start_time, end_time, end_time, start_time, end_time]
          );

          const rDayOfWeek = currentD.getDay();
          const rDayOfMonth = currentD.getDate();
          const rNthWeek = Math.ceil(rDayOfMonth / 7);

          const [rBlocked] = await conn.query(
            `SELECT id FROM room_blocked_times
             WHERE room_id = ?
             AND (
               (recurring_type = 'weekly' AND day_of_week = ?) OR
               (recurring_type = 'monthly_date' AND day_of_month = ?) OR
               (recurring_type = 'monthly_nth' AND nth_week = ? AND day_of_week = ?)
             )
             AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
            [room_id, rDayOfWeek, rDayOfMonth, rNthWeek, rDayOfWeek, start_time, start_time, end_time, end_time, start_time, end_time]
          );

          if (rConflicts.length > 0 || rBlocked.length > 0) {
            await conn.rollback();
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const dayStr = days[currentD.getDay()];
            const displayDate = `${dateStr}(${dayStr})`;
            
            const message = rBlocked.length > 0 
              ? `${displayDate}는 공간 관리자에 의해 예약 불가로 설정된 시간입니다.`
              : `${displayDate}에 이미 예약이 존재하여 전체 반복 예약을 진행할 수 없습니다.`;

            return res.status(409).json({
              success: false,
              message: message
            });
          }

          const [result] = await conn.query(
            `INSERT INTO reservations (room_id, requester_id, requester_name, requester_phone, title, reservation_date, start_time, end_time, reason, is_recurring, recurring_type, recurring_end_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [room_id, requester_id, requester_name, requester_phone, title, dateStr, start_time, end_time, reason, true, recurring_type, recurring_end_date]
          );
          reservationIds.push(result.insertId);
        }

        currentD.setDate(currentD.getDate() + 1);
        count++;
      }
    } else {

      const [result] = await conn.query(
        `INSERT INTO reservations (room_id, requester_id, requester_name, requester_phone, title, reservation_date, start_time, end_time, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [room_id, requester_id, requester_name, requester_phone, title, reservation_date, start_time, end_time, reason]
      );
      reservationIds.push(result.insertId);
    }


    await conn.commit();

    // 3. Send AlimTalk to ALL admins
    const [rooms] = await pool.query("SELECT room_name, floor FROM rooms WHERE id = ?", [room_id]);
    const roomInfo = rooms[0];

    if (roomInfo) {
      try {
        // Get all admin phones
        const [admins] = await pool.query(
          `SELECT u.phone FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE r.role_name = '관리자' AND u.phone IS NOT NULL AND u.phone != ''`
        );
        for (const admin of admins) {
          await sendNewReservationToAdmin({
            room_name: roomInfo.room_name,
            floor: roomInfo.floor,
            reservation_date,
            start_time,
            end_time,
            requester_name,
            title,
            reason
          }, admin.phone).catch(e => console.error("Admin AlimTalk skip:", e.message));
        }
      } catch (e) { console.error("AlimTalk skip:", e.message); }
    }

    res.json({ success: true, ids: reservationIds });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("Create Reservation Error:", err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    conn.release();
  }
});

/**
 * PATCH /api/reservations/bulk-approve — 관리자 일괄 승인
 */
router.patch("/bulk-approve", isLogged, isAdmin, async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    await pool.query("UPDATE reservations SET status = 'approved' WHERE id IN (?)", [ids]);

    // Send approval alimtalks
    const [rows] = await pool.query(
      `SELECT r.*, rm.room_name, rm.floor, rm.image_url FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.id IN (?)`, [ids]
    );
    const sentSignatures = new Set();
    for (const row of rows) {
      if (row.requester_phone) {
        if (row.is_recurring) {
          const signature = `${row.requester_phone}_${row.room_id}_${row.start_time}_${row.end_time}_${row.title}`;
          if (sentSignatures.has(signature)) continue;
          sentSignatures.add(signature);
        }
        sendApprovalAlimTalk(row).catch(e => console.error("Bulk Approval AlimTalk skip:", e.message));
      }
    }
    res.json({ success: true, count: rows.length });
  } catch (err) {
    console.error("Bulk Approve Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/reservations/bulk-reject — 관리자 일괄 거부
 */
router.patch("/bulk-reject", isLogged, isAdmin, async (req, res) => {
  const { ids, reject_reason } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "No IDs provided" });
  }

  try {
    await pool.query(
      "UPDATE reservations SET status = 'rejected', reject_reason = ? WHERE id IN (?)",
      [reject_reason || null, ids]
    );

    // Send rejection alimtalks
    const [rows] = await pool.query(
      `SELECT r.*, rm.room_name, rm.floor, rm.image_url FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.id IN (?)`, [ids]
    );
    const sentSignatures = new Set();
    for (const row of rows) {
      if (row.requester_phone) {
        if (row.is_recurring) {
          const signature = `${row.requester_phone}_${row.room_id}_${row.start_time}_${row.end_time}_${row.title}`;
          if (sentSignatures.has(signature)) continue;
          sentSignatures.add(signature);
        }
        sendRejectionAlimTalk(row, reject_reason).catch(e => console.error("Bulk Rejection AlimTalk skip:", e.message));
      }
    }
    res.json({ success: true, count: rows.length });
  } catch (err) {
    console.error("Bulk Reject Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/reservations/:id/approve — 관리자 승인 (개별)
 */
router.patch("/:id/approve", isLogged, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE reservations SET status = 'approved' WHERE id = ?", [id]);
    const [rows] = await pool.query(
      `SELECT r.*, rm.room_name, rm.floor, rm.image_url FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.id = ?`, [id]
    );
    if (rows.length > 0 && rows[0].requester_phone) {
      sendApprovalAlimTalk(rows[0]).catch(e => console.error("Approval AlimTalk skip:", e.message));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/reservations/:id/reject — 관리자 거부 (개별)
 */
router.patch("/:id/reject", isLogged, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { reject_reason } = req.body;
  try {
    await pool.query(
      "UPDATE reservations SET status = 'rejected', reject_reason = ? WHERE id = ?",
      [reject_reason || null, id]
    );
    const [rows] = await pool.query(
      `SELECT r.*, rm.room_name, rm.floor, rm.image_url FROM reservations r JOIN rooms rm ON r.room_id = rm.id WHERE r.id = ?`, [id]
    );
    if (rows.length > 0 && rows[0].requester_phone) {
      sendRejectionAlimTalk(rows[0], reject_reason).catch(e => console.error("Rejection AlimTalk skip:", e.message));
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Handle conflict inquiry
 */
router.post("/inquiry", isLogged, async (req, res) => {
  const { reservation_id, content } = req.body;
  const inquirer_id = req.session.user.id;

  try {
    // 1. Record Inquiry
    await pool.query(
      "INSERT INTO reservation_inquiries (reservation_id, inquirer_id, content) VALUES (?, ?, ?)",
      [reservation_id, inquirer_id, content]
    );

    // 2. Send AlimTalk to original requester
    const [original] = await pool.query(
      `SELECT r.*, rm.room_name, rm.floor, rm.image_url FROM reservations r 
       JOIN rooms rm ON r.room_id = rm.id WHERE r.id = ?`,
      [reservation_id]
    );

    if (original.length > 0) {
      await sendInquiryAlimTalk(original[0], req.session.user.userName, content);
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Reservations API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get Inquiries for a specific reservation
 */
router.get("/:id/inquiries", async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT i.*, u.user_id as inquirer_name 
       FROM reservation_inquiries i 
       JOIN users u ON i.inquirer_id = u.id 
       WHERE i.reservation_id = ? 
       ORDER BY i.created_at ASC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Answer an inquiry (Only for original requester)
 */
router.put("/inquiry/:inquiryId", isLogged, async (req, res) => {
  const { inquiryId } = req.params;
  const { answer } = req.body;
  const user = req.session.user;

  try {
    // Check if the current user is the owner of the reservation this inquiry belongs to
    const [original] = await pool.query(
      `SELECT r.requester_id FROM reservations r 
       JOIN reservation_inquiries i ON r.id = i.reservation_id 
       WHERE i.id = ?`,
      [inquiryId]
    );

    if (original.length === 0) return res.status(404).json({ success: false });
    if (original[0].requester_id !== user.id && !user.roles.includes("관리자")) {
      return res.status(403).json({ success: false, message: "Only the reservation owner can answer." });
    }

    await pool.query(
      "UPDATE reservation_inquiries SET answer = ?, status = 'answered' WHERE id = ?",
      [answer, inquiryId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Get all inquiries related to current user (Sent and Received)
 */
router.get("/inquiries/mine", isLogged, async (req, res) => {
  const user = req.session.user;
  try {
    // 1) Sent Inquiries
    const [sent] = await pool.query(
      `SELECT i.*, r.title as reservation_title, r.reservation_date, r.start_time, r.end_time, 
              rm.room_name, rm.floor, rm.image_url
       FROM reservation_inquiries i
       JOIN reservations r ON i.reservation_id = r.id
       JOIN rooms rm ON r.room_id = rm.id
       WHERE i.inquirer_id = ?
       ORDER BY i.created_at DESC`,
      [user.id]
    );

    // 2) Received Inquiries
    const [received] = await pool.query(
      `SELECT i.*, r.title as reservation_title, r.reservation_date, r.start_time, r.end_time, 
              rm.room_name, rm.floor, rm.image_url, u.user_id as inquirer_name
       FROM reservation_inquiries i
       JOIN reservations r ON i.reservation_id = r.id
       JOIN rooms rm ON r.room_id = rm.id
       JOIN users u ON i.inquirer_id = u.id
       WHERE r.requester_id = ?
       ORDER BY i.created_at DESC`,
      [user.id]
    );

    res.json({ sent, received });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Transfer Reservation to the Inquirer
 */
router.post("/inquiry/:inquiryId/transfer", isLogged, async (req, res) => {
  const { inquiryId } = req.params;
  const user = req.session.user;

  try {
    // 1) Check ownership and inquiry details
    const [rows] = await pool.query(
      `SELECT i.*, u.user_id as inquirer_name, u.phone as inquirer_phone 
       FROM reservation_inquiries i
       JOIN users u ON i.inquirer_id = u.id
       WHERE i.id = ?`,
      [inquiryId]
    );

    if (rows.length === 0) return res.status(404).json({ success: false, message: "Inquiry not found" });
    const inquiry = rows[0];

    const [resRows] = await pool.query("SELECT * FROM reservations WHERE id = ?", [inquiry.reservation_id]);
    if (resRows.length === 0) return res.status(404).json({ success: false, message: "Reservation not found" });
    const reservation = resRows[0];

    if (reservation.requester_id !== user.id && !user.roles.includes("관리자")) {
      return res.status(403).json({ success: false, message: "Only the owner can transfer." });
    }

    // 2) Update Reservation Owner
    await pool.query(
      `UPDATE reservations SET 
       requester_id = ?, 
       requester_name = ?, 
       requester_phone = ?,
       title = CONCAT('[양도] ', title)
       WHERE id = ?`,
      [inquiry.inquirer_id, inquiry.inquirer_name, inquiry.inquirer_phone, inquiry.reservation_id]
    );

    // 3) Update Inquiry Status (Preserve previous answer)
    await pool.query(
      `UPDATE reservation_inquiries SET 
       status = 'transferred', 
       answer = CONCAT(IFNULL(answer, ''), '\n[시스템] 공간이 양도되었습니다.') 
       WHERE id = ?`,
      [inquiryId]
    );

    res.json({ success: true, message: "Reservation transferred successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Update Reservation (Admin or Self)
 */
router.put("/:id", isLogged, async (req, res) => {
    const { id } = req.params;
    const { start_time, end_time, reason, reservation_date, title } = req.body;
    const user = req.session.user;

    try {
        const [record] = await pool.query("SELECT * FROM reservations WHERE id = ?", [id]);
        if (record.length === 0) return res.status(404).json({ success: false, message: "Not found" });

        if (!user.roles.includes("관리자") && record[0].requester_id !== user.id) {
            return res.status(403).json({ success: false, message: "No permission" });
        }

        const room_id = record[0].room_id;

        // 1. Conflict check against other 'approved' and 'pending' reservations
        const [conflicts] = await pool.query(
            `SELECT * FROM reservations 
             WHERE room_id = ? AND reservation_date = ? AND status IN ('approved', 'pending') AND id != ?
             AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
            [room_id, reservation_date, id, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (conflicts.length > 0) {
            return res.status(409).json({ 
                success: false, 
                message: "이미 해당 시간에 승인되었거나 대기 중인 다른 예약이 있습니다." 
            });
        }

        // 2. Check against room_blocked_times
        const d = new Date(reservation_date + 'T00:00:00');
        const dayOfWeek = d.getDay();
        const dayOfMonth = d.getDate();
        const nthWeek = Math.ceil(dayOfMonth / 7);

        const [blockedConflicts] = await pool.query(
            `SELECT * FROM room_blocked_times
             WHERE room_id = ?
             AND (
               (recurring_type = 'weekly' AND day_of_week = ?) OR
               (recurring_type = 'monthly_date' AND day_of_month = ?) OR
               (recurring_type = 'monthly_nth' AND nth_week = ? AND day_of_week = ?)
             )
             AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (? <= start_time AND ? >= end_time))`,
            [room_id, dayOfWeek, dayOfMonth, nthWeek, dayOfWeek, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (blockedConflicts.length > 0) {
            return res.status(409).json({
                success: false,
                message: "해당 시간은 공간 관리자에 의해 예약이 불가한 시간으로 설정되어 있습니다.",
                reason: blockedConflicts[0].reason
            });
        }

        await pool.query(
            "UPDATE reservations SET start_time = ?, end_time = ?, reason = ?, reservation_date = ?, title = ? WHERE id = ?",
            [start_time, end_time, reason, reservation_date, title, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error("Update Reservation Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Delete / Cancel (Admin or Self)
 */
router.delete("/:id", isLogged, async (req, res) => {
    const { id } = req.params;
    const user = req.session.user;
    try {
        const [record] = await pool.query("SELECT * FROM reservations WHERE id = ?", [id]);
        if (record.length === 0) return res.status(404).json({ success: false });

        if (!user.roles.includes("관리자") && record[0].requester_id !== user.id) {
            return res.status(403).json({ success: false, message: "No permission" });
        }

        await pool.query("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;
