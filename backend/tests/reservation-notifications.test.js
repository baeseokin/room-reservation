const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadRoutes() {
  const handlers = new Map(), notifications = [], queries = [];
  const router = {};
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    router[method] = (url, ...callbacks) => handlers.set(`${method} ${url}`, callbacks.at(-1));
  }
  const pool = { async query(sql) {
    queries.push(sql);
    if (sql.includes('SELECT r.*')) return [[{ id: 1, requester_id: 1, requester_phone: '01012345678', status: 'approved' }]];
    return [{}];
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/reservations.js'), 'utf8'), {
    module: { exports: {} }, console,
    require(name) {
      if (name === 'express') return { Router: () => router };
      if (name === '../config/db') return pool;
      if (name === '../utils/holidays') return { getHoliday: () => null };
      if (name === '../services/alimtalk') return Object.fromEntries(
        ['sendRejectionAlimTalk', 'sendCancellationAlimTalk', 'sendModificationAlimTalk'].map(name =>
          [name, async (...args) => { notifications.push({ name, args }); }])
      );
      throw new Error(name);
    }
  });
  async function run(route, roles) {
    const req = { params: { id: '1' }, body: { reservation_id: 1, content: 'question', reject_reason: 'reason' }, session: { user: { id: 1, roles } } };
    const res = { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; } };
    await handlers.get(route)(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  }
  return { run, notifications, queries };
}

test('reservation approval and inquiry do not send notifications', async () => {
  const routes = loadRoutes();
  await routes.run('patch /:id/approve', ['관리자']);
  await routes.run('post /inquiry', ['사용자']);
  assert.equal(routes.notifications.length, 0);
});
test('self cancellation is silent; admin cancellation notifies the requester', async () => {
  for (const route of ['delete /:id', 'patch /:id/cancel']) {
    const routes = loadRoutes();
    await routes.run(route, ['사용자']);
    assert.equal(routes.notifications.length, 0);
    await routes.run(route, ['관리자']);
    assert.equal(routes.notifications.length, 1);
    assert.equal(routes.notifications[0].name, 'sendCancellationAlimTalk');
    assert.equal(routes.notifications[0].args[0].requester_phone, '01012345678');
  }
});
test('admin reservation rejection notifies the requester', async () => {
  const routes = loadRoutes();
  await routes.run('patch /:id/reject', ['관리자']);
  assert.equal(routes.notifications.length, 1);
  assert.equal(routes.notifications[0].name, 'sendRejectionAlimTalk');
});
