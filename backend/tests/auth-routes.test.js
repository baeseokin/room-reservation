const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const express = require('express');
function fixture(admin = false, isNew = false) {
  let registered = !isNew;
  const user = { id: 7, user_id: 'existing', user_name: '사용자', phone: '01012345678', dept_name: '교회', password_hash: 'hashed', must_change_password: 0 };
  const db = { async query(sql) {
    if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
    if (sql.includes('RELEASE_LOCK')) return [[{}]];
    if (sql.includes('SELECT * FROM users')) return [registered ? [user] : []];
    if (sql.includes('INSERT INTO users')) { registered = true; return [{ insertId: user.id }]; }
    if (sql.includes('INSERT INTO user_roles')) return [{ affectedRows: 1 }];
    if (sql.includes('role_name FROM')) return [[{ role_name: admin ? '관리자' : '사용자' }]];
    if (sql.includes('SELECT dept_name')) return [[{ dept_name: '청년부' }]];
    if (sql.includes('UPDATE users')) return [{}];
    throw new Error('Unexpected query: ' + sql);
  }, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {}, async getConnection() { return this; } };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/auth.js'), 'utf8'), {
    module, require(name) {
      if (name === '../config/db') return db;
      if (name === '../services/otp') return { normalizePhone: s => s.replace(/[-\s]/g, ''), createOtpService: () => ({ verify: async () => user.phone }) };
      if (name === 'bcrypt') return { compare: async p => p === 'correct-password' };
      return require(name);
    }, Buffer, Date
  });
  const req = { body: {}, sessionID: 'session-before', ip: '127.0.0.1' };
  function session() {
    return { cookie: {}, save(cb) { cb(); }, reload(cb) { cb(); }, regenerate(cb) { req.session = session(); req.sessionID = 'session-after'; cb(); }, destroy(cb) { req.session = session(); cb(); } };
  }
  req.session = session();
  async function call(url, body = {}) {
    req.body = body;
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } };
    const layer = module.exports.stack.find(s => s.route?.path === url && s.route.methods.post);
    await layer.route.stack[0].handle(req, res, e => { throw e; });
    return res;
  }
  return { req, call, user };
}
test('existing user gets account-linked session directly after OTP', async () => {
  const f = fixture();
  const res = await f.call('/verify');
  assert.equal(res.data.user.id, 7);
  assert.equal(f.req.session.cookie.maxAge, 1800000);
  assert.equal(f.req.session.pendingAuth, undefined);
});
test('admin OTP alone never grants a user session; correct password is required', async () => {
  const f = fixture(true);
  const verified = await f.call('/verify');
  assert.equal(verified.data.nextStep, 'password');
  assert.equal(f.req.session.user, undefined);
  const rejected = await f.call('/admin-password', { password: 'wrong' });
  assert.equal(rejected.statusCode, 401);
  assert.equal(f.req.session.user, undefined);
  const accepted = await f.call('/admin-password', { password: 'correct-password' });
  assert.equal(accepted.data.user.roles[0], '관리자');
  assert.equal(f.req.session.pendingAuth, undefined);
});
test('admin password requires pending OTP, expires, and caps attempts', async () => {
  const f = fixture(true);
  await assert.rejects(f.call('/admin-password', { password: 'correct-password' }), { status: 401 });
  await f.call('/verify');
  f.req.session.pendingAuth.expiresAt = Date.now() - 1;
  await assert.rejects(f.call('/admin-password', { password: 'correct-password' }), { status: 401 });
  await f.call('/verify');
  for (let i = 0; i < 5; i++) assert.equal((await f.call('/admin-password', { password: 'wrong' })).statusCode, 401);
  assert.equal((await f.call('/admin-password', { password: 'correct-password' })).statusCode, 429);
  assert.equal(f.req.session.user, undefined);
});
test('incomplete profile requires name and a registered department', async () => {
  const f = fixture(); f.user.dept_name = null;
  assert.equal((await f.call('/verify')).data.nextStep, 'profile');
  assert.equal(f.req.session.user, undefined);
  assert.equal((await f.call('/complete-profile', { name: '', departmentId: 1 })).statusCode, 400);
});
test('password-only login is retired', async () => {
  const f = fixture(true);
  assert.equal((await f.call('/login', { userId: 'existing', password: 'correct-password' })).statusCode, 410);
  assert.equal(f.req.session.user, undefined);
});

test('new phone registers a user role only after name and department completion', async () => {
  const f = fixture(false, true);
  assert.equal((await f.call('/verify')).data.nextStep, 'profile');
  assert.equal(f.req.session.user, undefined);
  const res = await f.call('/complete-profile', { name: '신규사용자', departmentId: 2 });
  assert.equal(res.data.user.id, 7);
  assert.equal(res.data.user.roles[0], '사용자');
  assert.equal(f.req.session.pendingAuth, undefined);
});
