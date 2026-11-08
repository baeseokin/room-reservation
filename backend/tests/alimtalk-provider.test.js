const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function load(provider, environment = 'development', configured = false) {
  let calls = 0, constructors = 0;
  const values = { MESSAGE_PROVIDER: provider };
  if (configured) for (const key of ['SENDON_ID', 'SENDON_APIKEY', 'SENDON_PROFILE_ID', 'SENDON_TEMPLATE_APPROVED']) values[key] = 'test';
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../services/alimtalk.js'), 'utf8'), {
    module, console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === '../env') return { ENV: environment, envPick: (key, fallback) => values[key] ?? fallback };
      if (name === '@alipeople/sendon-sdk-typescript') return { Sendon: class {
        constructor() { constructors++; this.kakao = { sendAlimTalk: async () => { calls++; return { code: 200, data: { groupId: 'real' } }; } }; }
      } };
      throw new Error(name);
    }
  });
  return { api: module.exports, calls: () => calls, constructors: () => constructors };
}
const reservation = { requester_phone: '010-1234-5678', requester_name: 'Test' };
test('all reservation notifications mock without credentials or templates', async () => {
  const service = load('mock');
  const results = await Promise.all([
    service.api.sendNewReservationToAdmin(reservation, '010-1234-5678'),
    service.api.sendApprovalAlimTalk(reservation),
    service.api.sendRejectionAlimTalk(reservation, 'reason'),
    service.api.sendCancellationAlimTalk(reservation, 'reason'),
    service.api.sendModificationAlimTalk(reservation, 'reason'),
    service.api.sendInquiryAlimTalk(reservation, 'Test', 'question')
  ]);
  for (const result of results) { assert.equal(result.mock, true); assert.equal(result.success, true); }
  assert.equal(service.calls(), 0);
  assert.equal(service.constructors(), 0);
});
test('mock never sends even with real provider configuration', async () => {
  const service = load('mock', 'development', true);
  assert.equal((await service.api.sendApprovalAlimTalk(reservation)).mock, true);
  assert.equal(service.calls(), 0);
});
test('production rejects mock without calling SDK', async () => {
  const service = load('mock', 'production', true);
  await assert.rejects(service.api.sendApprovalAlimTalk(reservation), /MESSAGE_PROVIDER=mock/);
  assert.equal(service.calls(), 0);
});
test('sendon and legacy default still use SDK', async () => {
  for (const provider of ['sendon', undefined]) {
    const service = load(provider, 'production', true);
    assert.equal((await service.api.sendApprovalAlimTalk(reservation)).groupId, 'real');
    assert.equal(service.calls(), 1);
  }
});
