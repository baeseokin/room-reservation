const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { createOtpService, normalizePhone } = require('../services/otp');
const router = express.Router();
const otp = createOtpService(pool);
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const sessionCall = (req, method) => new Promise((resolve, reject) => req.session[method](e => e ? reject(e) : resolve()));
const rolesFor = async id => {
  const [rows] = await pool.query('SELECT r.role_name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?', [id]);
  return rows.map(r => r.role_name);
};
async function accountByPhone(phone) {
  const [rows] = await pool.query("SELECT * FROM users WHERE REPLACE(REPLACE(phone, '-', ''), ' ', '') = ?", [phone]);
  if (rows.length > 1) throw Object.assign(new Error('전화번호가 중복 등록되어 있습니다. 관리자에게 문의해 주세요.'), { status: 409 });
  return rows[0];
}
async function finish(req, res, user, roles) {
  await sessionCall(req, 'regenerate');
  req.session.cookie.maxAge = 1800000;
  req.session.user = { id: user.id, userId: user.user_id, userName: user.user_name, email: user.email, phone: normalizePhone(user.phone), deptName: user.dept_name, roles, mustChangePassword: roles.includes('관리자') && !!user.must_change_password };
  await sessionCall(req, 'save');
  res.json({ success: true, user: req.session.user, expiresAt: req.session.cookie.expires });
}
async function advance(req, res, user) {
  const roles = await rolesFor(user.id);
  if (roles.includes('관리자')) {
    req.session.pendingAuth.userId = user.id;
    req.session.pendingAuth.stage = 'password';
    await sessionCall(req, 'save');
    return res.json({ success: true, nextStep: 'password' });
  }
  return finish(req, res, user, roles);
}
function pending(req, stage) {
  const state = req.session.pendingAuth;
  if (!state || state.expiresAt <= Date.now() || state.stage !== stage) throw Object.assign(new Error('인증이 만료되었습니다. 휴대전화 인증을 다시 진행해 주세요.'), { status: 401 });
  return state;
}
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/request', asyncRoute(async (req, res) => {
  // Persist a browser-bound session before sending a challenge.
  req.session.otpBrowser = true;
  await sessionCall(req, 'save');
  res.json(await otp.request(normalizePhone(req.body.phone), req.ip, req.sessionID));
}));
router.post('/verify', asyncRoute(async (req, res) => {
  const phone = await otp.verify(req.body.challengeId, req.body.code, req.sessionID);
  await sessionCall(req, 'regenerate');
  req.session.cookie.maxAge = 300000;
  req.session.pendingAuth = { phone, stage: 'profile', expiresAt: Date.now() + 300000 };
  const user = await accountByPhone(phone);
  if (user && user.user_name && user.dept_name) return advance(req, res, user);
  await sessionCall(req, 'save');
  res.json({ success: true, nextStep: 'profile', name: user?.user_name || '' });
}));
router.post('/complete-profile', asyncRoute(async (req, res) => {
  const state = pending(req, 'profile');
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 100) return res.status(400).json({ success: false, message: '이름을 100자 이내로 입력해 주세요.' });
  const conn = await pool.getConnection();
  let locked = false;
  try {
    const [[lock]] = await conn.query("SELECT GET_LOCK('room_phone_registration', 5) AS acquired");
    locked = Number(lock.acquired) === 1;
    if (!locked) return res.status(409).json({ success: false, message: '잠시 후 다시 시도해 주세요.' });
    await conn.beginTransaction();
    const [[dept]] = await conn.query('SELECT dept_name FROM departments WHERE id = ?', [req.body.departmentId]);
    if (!dept) { await conn.rollback(); return res.status(400).json({ success: false, message: '등록된 부서를 선택해 주세요.' }); }
    const user = await accountByPhone(state.phone);
    if (user) {
      // Existing admin profiles are edited only after their password is verified.
      const roles = await rolesFor(user.id);
      if (roles.includes('관리자')) {
        await conn.rollback();
        req.session.pendingAuth.profile = { name, department: dept.dept_name };
        return advance(req, res, user);
      }
      await conn.query('UPDATE users SET user_name = ?, dept_name = ? WHERE id = ?', [name, dept.dept_name, user.id]);
    } else {
      const [created] = await conn.query('INSERT INTO users (user_id, user_name, phone, dept_name) VALUES (?, ?, ?, ?)', [`phone_${crypto.randomUUID()}`, name, state.phone, dept.dept_name]);
      const [assigned] = await conn.query("INSERT INTO user_roles (user_id, role_id) SELECT ?, id FROM roles WHERE role_name = '사용자'", [created.insertId]);
      if (assigned.affectedRows !== 1) throw new Error('Missing user role');
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { if (locked) await conn.query("SELECT RELEASE_LOCK('room_phone_registration')"); conn.release(); }
  return advance(req, res, await accountByPhone(state.phone));
}));
router.post('/admin-password', asyncRoute(async (req, res) => {
  const state = pending(req, 'password');
  // Serialize attempts across parallel requests and server instances using the session row.
  const conn = await pool.getConnection();
  let locked = false;
  const lockName = 'pwd_' + crypto.createHash('sha256').update(req.sessionID).digest('hex').slice(0, 50);
  try {
    const [[lock]] = await conn.query('SELECT GET_LOCK(?, 5) AS acquired', [lockName]);
    locked = Number(lock.acquired) === 1;
    if (!locked) return res.status(429).json({ success: false, message: '잠시 후 다시 시도해 주세요.' });
    await sessionCall(req, 'reload');
    const fresh = pending(req, 'password');
    fresh.attempts = (fresh.attempts || 0) + 1;
    if (fresh.attempts > 5) return res.status(429).json({ success: false, message: '휴대전화 인증을 다시 진행해 주세요.' });
    await sessionCall(req, 'save');
    const user = await accountByPhone(state.phone);
    const roles = user ? await rolesFor(user.id) : [];
    if (!user || user.id !== fresh.userId || !roles.includes('관리자') || !user.password_hash || typeof req.body.password !== 'string' || !await bcrypt.compare(req.body.password, user.password_hash)) return res.status(401).json({ success: false, message: '비밀번호를 확인해 주세요.' });
    if (fresh.profile) {
      await pool.query('UPDATE users SET user_name = ?, dept_name = ? WHERE id = ?', [fresh.profile.name, fresh.profile.department, user.id]);
      user.user_name = fresh.profile.name; user.dept_name = fresh.profile.department;
    }
    return await finish(req, res, user, roles);
  } finally {
    if (locked) await conn.query('SELECT RELEASE_LOCK(?)', [lockName]);
    conn.release();
  }
}));
// Password-only authentication and public account enumeration are retired.
router.post('/login', (req, res) => res.status(410).json({ success: false, message: '카카오 알림톡 인증을 이용해 주세요.' }));
router.get('/session', (req, res) => res.json({ success: !!req.session.user, user: req.session.user || null, expiresAt: req.session.user ? req.session.cookie.expires : null }));
router.post('/change-password', asyncRoute(async (req, res) => {
  if (!req.session.user?.roles.includes('관리자')) return res.status(403).json({ success: false, message: '관리자 인증이 필요합니다.' });
  const { currentPassword, newPassword } = req.body;
  if (typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) return res.status(400).json({ success: false, message: '새 비밀번호를 8자 이상, 72바이트 이내로 입력해 주세요.' });
  const [[user]] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.session.user.id]);
  if (!user?.password_hash || typeof currentPassword !== 'string' || !await bcrypt.compare(currentPassword, user.password_hash)) return res.status(401).json({ success: false, message: '현재 비밀번호를 확인해 주세요.' });
  await pool.query('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [await bcrypt.hash(newPassword, 10), req.session.user.id]);
  req.session.user.mustChangePassword = false;
  await sessionCall(req, 'save');
  res.json({ success: true });
}));
router.post('/logout', asyncRoute(async (req, res) => {
  await sessionCall(req, 'destroy');
  res.clearCookie('room.sid.v2', { path: '/', httpOnly: true, sameSite: 'lax' });
  res.json({ success: true });
}));
router.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  res.status(error.status || 503).json({ success: false, message: error.status ? error.message : '인증 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
});
module.exports = router;
