const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.OTP_SECRET = 'test-only-otp-secret-with-more-than-32-characters';
process.env.APP_MODE = 'demo';
process.env.MESSAGE_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';
const { createOtpService, normalizePhone, validPhone, configuration } = require('../services/otp');
function fakeDb() {
  const challenges = new Map();
  const conn = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    async query(sql, args = []) {
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('RELEASE_LOCK')) return [[{}]];
      if (sql.includes('AS total')) return [[{ total: challenges.size, per_phone: 0, per_ip: 0 }]];
      if (sql.includes('AS count')) return [[{ count: 0 }]];
      if (sql.includes('INSERT INTO otp_challenges')) {
        const [id, phone, code_digest, ip_hash, session_digest] = args;
        challenges.set(id, { id, phone, code_digest, ip_hash, session_digest, attempts: 0, used: 0, sent: 0, alive: 1 });
      } else if (sql.includes('WHERE phone =')) {
        for (const row of challenges.values()) if (row.phone === args[0]) row.used = 1;
      } else if (sql.includes('SET sent')) challenges.get(args[0]).sent = 1;
      else if (sql.startsWith('SELECT *')) return [[challenges.get(args[0])].filter(Boolean)];
      else if (sql.includes('attempts = attempts')) { const row = challenges.get(args[1]); row.attempts++; row.used = args[0]; }
      else if (sql.includes('SET used = 1')) challenges.get(args[0]).used = 1;
      return [{}];
    }
  };
  return { ...conn, getConnection: async () => conn, challenges };
}
test('phone normalization rejects non-phone input', () => {
  assert.equal(normalizePhone('010-1234 5678'), '01012345678');
  assert.ok(validPhone('01012345678'));
  assert.ok(!validPhone(normalizePhone('abc01012345678')));
});
test('OTP is digested, bound to browser, consumed once', async () => {
  const db = fakeDb(), otp = createOtpService(db);
  const challenge = await otp.request('01012345678', '127.0.0.1', 'browser');
  assert.match(challenge.demoCode, /^\d{6}$/);
  assert.notEqual(db.challenges.get(challenge.challengeId).code_digest, challenge.demoCode);
  await assert.rejects(otp.verify(challenge.challengeId, challenge.demoCode, 'other-browser'), { status: 401 });
  assert.equal(await otp.verify(challenge.challengeId, challenge.demoCode, 'browser'), '01012345678');
  await assert.rejects(otp.verify(challenge.challengeId, challenge.demoCode, 'browser'), { status: 401 });
});
test('five incorrect codes exhaust the challenge', async () => {
  const db = fakeDb(), otp = createOtpService(db);
  const challenge = await otp.request('01012345678', '127.0.0.1', 'browser');
  const wrong = challenge.demoCode === '000000' ? '000001' : '000000';
  for (let n = 0; n < 5; n++) await assert.rejects(otp.verify(challenge.challengeId, wrong, 'browser'), { status: 401 });
  await assert.rejects(otp.verify(challenge.challengeId, challenge.demoCode, 'browser'), { status: 401 });
});
test('expiry and resend invalidate previous codes', async () => {
  const db = fakeDb(), otp = createOtpService(db);
  const first = await otp.request('01012345678', '127.0.0.1', 'browser');
  const second = await otp.request('01012345678', '127.0.0.1', 'browser');
  await assert.rejects(otp.verify(first.challengeId, first.demoCode, 'browser'), { status: 401 });
  db.challenges.get(second.challengeId).alive = 0;
  await assert.rejects(otp.verify(second.challengeId, second.demoCode, 'browser'), { status: 401 });
});
test('rate limits reject before generating a challenge', async () => {
  const db = fakeDb();
  const original = db.getConnection;
  db.getConnection = async () => {
    const conn = await original(); const query = conn.query.bind(conn);
    return { ...conn, query: (sql, args) => sql.includes('AS count') ? Promise.resolve([[{ count: 1 }]]) : query(sql, args) };
  };
  await assert.rejects(createOtpService(db).request('01012345678', '127.0.0.1', 'browser'), { status: 429 });
  assert.equal(db.challenges.size, 0);
});
test('missing sendon configuration is rejected before creating a challenge', async () => {
  // Configuration failure must not create a request or expose a code.
  process.env.MESSAGE_PROVIDER = 'sendon';
  const old = process.env.SENDON_TEMPLATE_OTP_ID;
  process.env.SENDON_TEMPLATE_OTP_ID = '';
  const db = fakeDb();
  try {
    await assert.rejects(createOtpService(db).request('01012345678', '127.0.0.1', 'browser'), { status: 503 });
    assert.equal(db.challenges.size, 0);
  } finally {
    if (old === undefined) delete process.env.SENDON_TEMPLATE_OTP_ID; else process.env.SENDON_TEMPLATE_OTP_ID = old;
    process.env.MESSAGE_PROVIDER = 'mock';
  }
});
function serviceWithProvider(db, result) {
  const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
  const module = { exports: {} };
  const values = { OTP_SECRET: 'provider-test-secret-more-than-32-characters', MESSAGE_PROVIDER: 'sendon', SENDON_ID: 'test', SENDON_APIKEY: 'test', SENDON_PROFILE_ID: 'test', SENDON_TEMPLATE_OTP_ID: 'test' };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/otp.js'), 'utf8'), {
    module, Buffer, setTimeout, clearTimeout,
    require(name) {
      if (name === '../env') return { ENV: 'test', envPick: (k, fallback) => values[k] ?? fallback, envNumber: (k, fallback) => fallback };
      if (name === '@alipeople/sendon-sdk-typescript') return { Sendon: class { constructor() { this.kakao = { sendAlimTalk: async () => result }; } } };
      return require(name);
    }
  });
  return module.exports.createOtpService(db);
}
test('provider rejection consumes the challenge; acceptance never exposes OTP', async () => {
  const failed = fakeDb();
  await assert.rejects(serviceWithProvider(failed, { code: 500 }).request('01012345678', '127.0.0.1', 'browser'), { status: 503 });
  assert.equal([...failed.challenges.values()][0].used, 1);
  const accepted = fakeDb();
  const result = await serviceWithProvider(accepted, { code: 200 }).request('01012345678', '127.0.0.1', 'browser');
  assert.equal(result.demoCode, undefined);
  assert.equal([...accepted.challenges.values()][0].sent, 1);
});
test('mock OTP works without APP_MODE=demo', async () => {
  const previous = process.env.APP_MODE;
  delete process.env.APP_MODE;
  try {
    const result = await createOtpService(fakeDb()).request('01012345678', '127.0.0.1', 'browser');
    assert.match(result.demoCode, /^\d{6}$/);
  } finally {
    if (previous !== undefined) process.env.APP_MODE = previous;
  }
});
