const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const file = require('node:path').resolve('apps/web/src/lib/judging/outbox.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { newOperation, queueOperation, flushOutbox } = mod.exports;

class MemoryStore {
  rows = new Map();
  async list(owner) { return structuredClone([...this.rows.values()].filter(row => row.owner === owner)); }
  async put(row) { this.rows.set(row.key, structuredClone(row)); }
  async remove(key) { this.rows.delete(key); }
}
function operation(id = 'synthetic-op') {
  return newOperation('synthetic-judge', 'ph', 'synthetic-event', { schema_version: 1, operation_id: id, division_id: 'open', crew_id: 'synthetic-crew', expected_revision: 0, criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 }, deductions: [] });
}
function receipt(row) { return { operation_id: row.command.operation_id, receipt_id: 'synthetic-receipt', event_id: row.event, division_id: row.command.division_id, crew_id: row.command.crew_id, judge_uid: row.owner, score_revision: 1, net_score: 90, recorded_at: 1 }; }

test('drafts remain local until explicitly queued', async () => {
  const store = new MemoryStore(); const draft = operation(); await store.put(draft);
  let sends = 0;
  await flushOutbox(store, draft.owner, async row => { sends++; return receipt(row); });
  assert.equal(sends, 0);
  await queueOperation(store, draft);
  await flushOutbox(store, draft.owner, async row => { sends++; return receipt(row); });
  assert.equal(sends, 1); assert.equal((await store.list(draft.owner))[0].state, 'acknowledged');
});
test('lost acknowledgement replays identical operation and keeps a single server effect', async () => {
  const store = new MemoryStore(); const row = operation(); await queueOperation(store, row);
  const accepted = new Map(); let disconnected = true;
  const send = async value => { if (!accepted.has(value.command.operation_id)) accepted.set(value.command.operation_id, receipt(value)); if (disconnected) throw new Error('connection lost after commit'); return accepted.get(value.command.operation_id); };
  await flushOutbox(store, row.owner, send, 1000);
  assert.equal((await store.list(row.owner))[0].state, 'queued');
  disconnected = false;
  await flushOutbox(store, row.owner, send, 100000);
  assert.equal(accepted.size, 1); assert.equal((await store.list(row.owner))[0].receipt.receipt_id, 'synthetic-receipt');
});
test('conflicts and permission denials retain commands and never retry automatically', async () => {
  for (const [status, state] of [[409, 'conflict'], [403, 'rejected'], [400, 'rejected']]) {
    const store = new MemoryStore(); const row = operation(); await queueOperation(store, row);
    let calls = 0; const send = async () => { calls++; throw { status }; };
    await flushOutbox(store, row.owner, send, 1000); await flushOutbox(store, row.owner, send, 100000);
    assert.equal(calls, 1); assert.equal((await store.list(row.owner))[0].state, state);
    assert.deepEqual((await store.list(row.owner))[0].command, row.command);
  }
});
test('expired sessions and server failures wait with backoff without dropping commands', async () => {
  for (const status of [401, 429, 503]) {
    const store = new MemoryStore(); const row = operation(); await queueOperation(store, row);
    let calls = 0; const send = async () => { calls++; throw { status }; };
    await flushOutbox(store, row.owner, send, 1000); await flushOutbox(store, row.owner, send, 1001);
    assert.equal(calls, 1); assert.equal((await store.list(row.owner))[0].state, 'queued');
  }
});
test('crashed sending operations recover; records from other accounts are never sent', async () => {
  const store = new MemoryStore(); const row = operation(); row.state = 'sending'; await store.put(row);
  assert.equal((await store.list('another-judge')).length, 0);
  await flushOutbox(store, 'another-judge', async () => { assert.fail('cross-account send'); });
  await flushOutbox(store, row.owner, async value => receipt(value));
  assert.equal((await store.list(row.owner))[0].state, 'acknowledged');
});
test('changed retry payloads and mismatched receipts are preserved for review', async () => {
  const store = new MemoryStore(); const row = operation(); await queueOperation(store, row);
  const changed = structuredClone(row); changed.command.criteria.execution = 20;
  await assert.rejects(queueOperation(store, changed), /cannot be changed/);
  await flushOutbox(store, row.owner, async value => ({ ...receipt(value), judge_uid: 'another-judge' }));
  assert.equal((await store.list(row.owner))[0].state, 'conflict');
});
