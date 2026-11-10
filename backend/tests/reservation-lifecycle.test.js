const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture(conflict = false) {
  const handlers = new Map(), queries = [];
  const router = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) router[method] = (url, ...callbacks) => handlers.set(method + ' ' + url, callbacks);
  const db = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (sql.includes('SELECT * FROM reservations WHERE id')) return [[{ id: 1, requester_id: 7, room_id: 2, status: 'approved' }]];
      if (sql.includes('SELECT r.*')) return [[{ id: 1, requester_id: 7, status: 'approved' }]];
      if (sql.includes('SELECT * FROM reservations') && conflict) return [[{ id: 9 }]];
      if (sql.includes('INSERT INTO reservations')) return [{ insertId: 1 }];
      return [[]];
    },
    async getConnection() { return this; }, async beginTransaction() {}, async commit() {}, async rollback() {}, release() {}
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/reservations.js'), 'utf8'), {
    module: { exports: {} }, console,
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../config/db') return db;
      if (name === '../utils/holidays') return { getHoliday: () => null };
      if (name === '../services/alimtalk') return {};
      throw new Error(name);
    }
  });
  async function call(route, user = { id: 7, roles: ['사용자'] }, extra = {}) {
    const req = { session: { user }, params: { id: 1 }, body: { room_id: 2, reservation_date: '2026-11-20', start_time: '10:00', end_time: '11:00', title: 'test', ...extra } };
    const res = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } };
    const callbacks = handlers.get(route);
    for (const callback of callbacks) {
      let next = false;
      await callback(req, res, () => { next = true; });
      if (!next) break;
    }
    return res;
  }
  return { call, queries };
}
test('new booking explicitly confirms, independent of database default', async () => {
  const f = fixture();
  assert.equal((await f.call('post /')).statusCode, 200);
  assert.match(f.queries.find(q => q.sql.includes('INSERT INTO reservations')).sql, /'approved'/);
  assert.ok(f.queries.find(q => q.sql.includes('FOR UPDATE')));
});
test('creation requires login and rejects occupied times without inserting', async () => {
  const f = fixture(true);
  assert.equal((await f.call('post /', null)).statusCode, 401);
  assert.equal((await f.call('post /')).statusCode, 409);
  assert.ok(!f.queries.some(q => q.sql.includes('INSERT INTO reservations')));
});
test('self modification stays confirmed and cancellation is immediate', async () => {
  const f = fixture();
  assert.equal((await f.call('put /:id')).statusCode, 200);
  assert.equal(f.queries.find(q => q.sql.includes('UPDATE reservations')).params[6], 'approved');
  const res = await f.call('patch /:id/cancel');
  assert.equal(res.data.status, 'cancelled');
});
test('other users cannot change or cancel a reservation', async () => {
  const f = fixture();
  for (const route of ['put /:id', 'patch /:id/cancel']) assert.equal((await f.call(route, { id: 8, roles: ['사용자'] })).statusCode, 403);
  assert.ok(!f.queries.some(q => q.sql.includes('UPDATE reservations')));
});
