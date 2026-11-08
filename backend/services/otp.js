const crypto = require('node:crypto');
const { Sendon } = require('@alipeople/sendon-sdk-typescript');
const { envPick, envNumber, ENV } = require('../env');
const normalizePhone = value => String(value || '').replace(/[-\s]/g, '');
const validPhone = value => /^01[016789]\d{7,8}$/.test(value);
const digest = (id, code) => crypto.createHmac('sha256', envPick('OTP_SECRET')).update(`${id}:${code}`).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });

function configuration() {
  const mock = ENV !== 'production' && envPick('MESSAGE_PROVIDER') === 'mock';
  if (String(envPick('OTP_SECRET', '')).length < 32) throw fail(503, '인증 서비스 설정을 확인해 주세요.');
  if (!mock && (envPick('MESSAGE_PROVIDER') !== 'sendon' || ['SENDON_ID', 'SENDON_APIKEY', 'SENDON_PROFILE_ID', 'SENDON_TEMPLATE_OTP_ID'].some(k => !envPick(k)))) throw fail(503, '인증 서비스 설정을 확인해 주세요.');
  let mapping;
  try { mapping = JSON.parse(envPick('SENDON_VARIABLES_OTP', '{"#{인증번호}":"code"}')); } catch { throw fail(503, '인증 템플릿 설정을 확인해 주세요.'); }
  if (!mapping || Array.isArray(mapping) || !Object.keys(mapping).length || Object.values(mapping).some(v => v !== 'code')) throw fail(503, '인증 템플릿 설정을 확인해 주세요.');
  return { mock, mapping };
}

function createOtpService(pool) {
  async function request(phone, ip, sessionId) {
    if (!validPhone(phone)) throw fail(400, '올바른 휴대전화번호를 입력해 주세요.');
    const { mock, mapping } = configuration();
    const id = crypto.randomUUID();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const ipHash = digest('ip', ip);
    const binding = digest('session', sessionId);
    const conn = await pool.getConnection();
    let locked = false;
    try {
      const [[lock]] = await conn.query("SELECT GET_LOCK('room_otp_request', 5) AS acquired");
      locked = Number(lock.acquired) === 1;
      if (!locked) throw fail(429, '잠시 후 다시 요청해 주세요.');
      await conn.beginTransaction();
      const [[counts]] = await conn.query(`SELECT COUNT(*) AS total, SUM(phone = ?) AS per_phone,
        SUM(ip_hash = ?) AS per_ip, MAX(CASE WHEN phone = ? THEN created_at END) AS last_request
        FROM otp_challenges WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`, [phone, ipHash, phone]);
      const [[recent]] = await conn.query('SELECT COUNT(*) AS count FROM otp_challenges WHERE phone = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)', [phone, envNumber('OTP_RESEND_INTERVAL_SECONDS', 60)]);
      if (Number(recent.count) || Number(counts.total) >= envNumber('OTP_HOURLY_LIMIT', 200) || Number(counts.per_phone) >= envNumber('OTP_PHONE_HOURLY_LIMIT', 5) || Number(counts.per_ip) >= envNumber('OTP_IP_HOURLY_LIMIT', 30)) throw fail(429, '인증 요청이 많습니다. 잠시 후 다시 시도해 주세요.');
      await conn.query('UPDATE otp_challenges SET used = 1 WHERE phone = ? AND used = 0', [phone]);
      await conn.query('INSERT INTO otp_challenges (id, phone, code_digest, ip_hash, session_digest, expires_at) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE))', [id, phone, digest(id, code), ipHash, binding]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (locked) await conn.query("SELECT RELEASE_LOCK('room_otp_request')");
      conn.release();
    }
    try {
      if (!mock) {
        const sdk = new Sendon({ id: envPick('SENDON_ID'), apikey: envPick('SENDON_APIKEY'), debug: false });
        let timeout;
        try {
          const result = await Promise.race([
            sdk.kakao.sendAlimTalk({ sendProfileId: envPick('SENDON_PROFILE_ID'), templateId: envPick('SENDON_TEMPLATE_OTP_ID'), to: [{ phone, variables: Object.fromEntries(Object.keys(mapping).map(k => [k, code])) }] }),
            new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), 15000); })
          ]);
          if (String(result.code) !== '200') throw new Error('not accepted');
        } finally { clearTimeout(timeout); }
      }
      await pool.query('UPDATE otp_challenges SET sent = 1 WHERE id = ? AND used = 0', [id]);
      return { challengeId: id, expiresInSeconds: 180, resendInSeconds: envNumber('OTP_RESEND_INTERVAL_SECONDS', 60), ...(mock ? { demoCode: code } : {}) };
    } catch {
      await pool.query('UPDATE otp_challenges SET used = 1 WHERE id = ?', [id]);
      throw fail(503, '인증번호 발송을 확인하지 못했습니다. 잠시 후 다시 요청해 주세요.');
    }
  }

  async function verify(id, code, sessionId) {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !/^\d{6}$/.test(String(code))) throw fail(400, '6자리 인증번호를 확인해 주세요.');
    configuration();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[row]] = await conn.query('SELECT *, expires_at > NOW() AS alive FROM otp_challenges WHERE id = ? FOR UPDATE', [id]);
      if (!row || row.session_digest !== digest('session', sessionId) || row.used || !row.sent || !row.alive || row.attempts >= 5) throw fail(401, '인증번호가 만료되었거나 사용할 수 없습니다. 다시 요청해 주세요.');
      const matches = crypto.timingSafeEqual(Buffer.from(row.code_digest, 'hex'), Buffer.from(digest(id, String(code)), 'hex'));
      await conn.query('UPDATE otp_challenges SET attempts = attempts + 1, used = ? WHERE id = ?', [matches || row.attempts >= 4 ? 1 : 0, id]);
      await conn.commit();
      if (!matches) throw fail(401, '인증번호가 일치하지 않습니다.');
      return row.phone;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally { conn.release(); }
  }
  return { request, verify };
}
module.exports = { createOtpService, normalizePhone, validPhone, configuration };
