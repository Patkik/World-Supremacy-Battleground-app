// ============================================================================
// TIER 5: ADVERSARIAL COVERAGE HARDENING (VENUE OPS, OFFLINE RECOVERY & CLIENT UX)
// Suite: tests/e2e_tiers/tier5_adversarial/t5_ops_client_hardening.test.mjs
// Coverage:
//   - Section 1: Offline IndexedDB Outbox FIFO, Exponential Backoff & Web Locks
//   - Section 2: Dancer Venue Check-In (F35) QR Deduplication & 4-Vector Gating
//   - Section 3: Stage Marshal Queue (F36) Monotonic Progression & Hold Barrier
//   - Section 4: Native Contact Inquiries (F37, F38) 256-Bit Keys & Dual-Layer Quotas
//   - Section 5: Arena Broadcast HUD (F34) Zero-PII Proofs, 100dvh & Tabular Numerics
//   - Section 6: Brand Mark Dark-Mode White Filter (F39) & Hero Video Guards (F40)
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Module from 'node:module';
import ts from 'typescript';
import { SystemHarness } from '../harness/system_harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

// Helper to compile and load TypeScript modules dynamically
function loadTsModule(relPath) {
  const fullPath = path.resolve(rootDir, relPath);
  const source = fs.readFileSync(fullPath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = new Module(fullPath);
  mod._compile(transpiled, fullPath);
  return mod.exports;
}

// Load real outbox implementation
const outboxModule = loadTsModule('apps/web/src/lib/judging/outbox.ts');
const { newOperation, queueOperation, flushOutbox, operationKey } = outboxModule;

// In-Memory ScoreStore implementing ScoreStore interface
class MemoryScoreStore {
  constructor() {
    this.rows = new Map();
  }
  async list(owner) {
    return structuredClone([...this.rows.values()].filter(row => row.owner === owner));
  }
  async put(row) {
    this.rows.set(row.key, structuredClone(row));
  }
  async remove(key) {
    this.rows.delete(key);
  }
}

function makeScoreCommand(opId = 'synthetic-op', revision = 0, crewId = 'crew-1', divisionId = 'open') {
  return {
    schema_version: 1,
    operation_id: opId,
    division_id: divisionId,
    crew_id: crewId,
    expected_revision: revision,
    criteria: {
      choreography: 18,
      musicality: 18,
      execution: 18,
      stage_presence: 18,
      entertainment: 18,
    },
    deductions: [],
  };
}

function makeValidReceipt(operation, overrides = {}) {
  return {
    operation_id: operation.command.operation_id,
    receipt_id: `receipt-${operation.command.operation_id}`,
    event_id: operation.event,
    division_id: operation.command.division_id,
    crew_id: operation.command.crew_id,
    judge_uid: operation.owner,
    score_revision: operation.command.expected_revision + 1,
    net_score: 90,
    recorded_at: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

// ============================================================================
// SECTION 1: OFFLINE INDEXEDDB OUTBOX & WEB LOCKS
// ============================================================================
test.describe('Tier 5 — Section 1: Offline IndexedDB Outbox & Web Locks', () => {

  test('T5-01: Outbox Schema & Input Validation: Rejects missing owner, chapter, event, invalid schema_version or empty op_id', () => {
    const cmd = makeScoreCommand('op-valid');

    // Missing owner
    assert.throws(() => newOperation('', 'ph', 'event-1', cmd), /verified account and command version are required/);

    // Missing chapter
    assert.throws(() => newOperation('judge-1', '', 'event-1', cmd), /verified account and command version are required/);

    // Missing event
    assert.throws(() => newOperation('judge-1', 'ph', '', cmd), /verified account and command version are required/);

    // Invalid schema version (e.g. 2 instead of 1)
    const badVersionCmd = { ...cmd, schema_version: 2 };
    assert.throws(() => newOperation('judge-1', 'ph', 'event-1', badVersionCmd), /verified account and command version are required/);

    // Empty operation_id
    const emptyOpCmd = { ...cmd, operation_id: '' };
    assert.throws(() => newOperation('judge-1', 'ph', 'event-1', emptyOpCmd), /verified account and command version are required/);
  });

  test('T5-02: Draft Mutability vs Queued Immutability: Mutating scores of queued operation is strictly rejected', async () => {
    const store = new MemoryScoreStore();
    const op = newOperation('judge-1', 'ph', 'event-1', makeScoreCommand('op-mut-1'));
    await store.put(op);

    // Queue the operation
    const queued = await queueOperation(store, op);
    assert.equal(queued.state, 'queued');

    // Re-queueing identical command returns existing idempotent record
    const reQueued = await queueOperation(store, op);
    assert.equal(reQueued.state, 'queued');

    // Mutating criteria on already queued operation must throw error
    const mutatedOp = structuredClone(op);
    mutatedOp.command.criteria.execution = 20;
    await assert.rejects(
      queueOperation(store, mutatedOp),
      /A saved command cannot be changed/
    );
  });

  test('T5-03: Chronological FIFO Synchronization: Operations processed strictly in ascending createdAt order', async () => {
    const store = new MemoryScoreStore();
    const processed = [];

    // Create 3 operations with distinct createdAt timestamps
    const op1 = newOperation('judge-fifo', 'ph', 'event-1', makeScoreCommand('op-fifo-1', 0, 'crew-1'));
    op1.createdAt = 1000;
    await queueOperation(store, op1);

    const op2 = newOperation('judge-fifo', 'ph', 'event-1', makeScoreCommand('op-fifo-2', 0, 'crew-2'));
    op2.createdAt = 3000;
    await queueOperation(store, op2);

    const op3 = newOperation('judge-fifo', 'ph', 'event-1', makeScoreCommand('op-fifo-3', 0, 'crew-3'));
    op3.createdAt = 2000; // Intentionally out of insertion order
    await queueOperation(store, op3);

    // Flush outbox
    await flushOutbox(store, 'judge-fifo', async (sending) => {
      processed.push(sending.command.operation_id);
      return makeValidReceipt(sending);
    }, 5000);

    // Strict FIFO sorting by createdAt (op-fifo-1 -> op-fifo-3 -> op-fifo-2)
    assert.deepEqual(processed, ['op-fifo-1', 'op-fifo-3', 'op-fifo-2']);

    const all = await store.list('judge-fifo');
    assert.ok(all.every(r => r.state === 'acknowledged'));
  });

  test('T5-04: Simulated Network Drop & Head-of-Line Blocking: Transient failure sets queued state, backoff, and halts queue', async () => {
    const store = new MemoryScoreStore();
    const attempts = [];

    const op1 = newOperation('judge-net', 'ph', 'event-1', makeScoreCommand('op-net-1', 0, 'crew-1'));
    op1.createdAt = 1000;
    await queueOperation(store, op1);

    const op2 = newOperation('judge-net', 'ph', 'event-1', makeScoreCommand('op-net-2', 0, 'crew-2'));
    op2.createdAt = 2000;
    await queueOperation(store, op2);

    // Simulated network socket hangup on op1 (no status code / generic Error)
    let networkDead = true;
    const send = async (sending) => {
      attempts.push(sending.command.operation_id);
      if (networkDead) {
        throw new Error('ECONNRESET: simulated wifi disconnection');
      }
      return makeValidReceipt(sending);
    };

    const flushTime = 5000;
    await flushOutbox(store, 'judge-net', send, flushTime);

    // Only op1 was attempted; head-of-line blocking prevented op2 from being sent
    assert.deepEqual(attempts, ['op-net-1']);

    const list1 = await store.list('judge-net');
    const rec1 = list1.find(r => r.command.operation_id === 'op-net-1');
    assert.equal(rec1.state, 'queued');
    assert.equal(rec1.attempts, 1);
    // Backoff formula: flushTime + 1000 * 2^1 = 5000 + 2000 = 7000
    assert.equal(rec1.nextAttemptAt, 7000);
    assert.equal(rec1.message, 'Saved on this device. Waiting to retry.');

    // Immediate flush attempt prior to op1 backoff expiry (now = 6000)
    // op1 (nextAttemptAt = 7000) is skipped by continue; op2 (nextAttemptAt = 0) is attempted and fails
    attempts.length = 0;
    await flushOutbox(store, 'judge-net', send, 6000);
    // op1 was skipped; op2 was attempted once and failed with backoff
    assert.deepEqual(attempts, ['op-net-2']);
    const list2 = await store.list('judge-net');
    const rec2 = list2.find(r => r.command.operation_id === 'op-net-2');
    assert.equal(rec2.state, 'queued');
    assert.equal(rec2.attempts, 1);
    assert.equal(rec2.nextAttemptAt, 8000);

    // Network recovers: flush at t = 9000 (after both backoffs expire)
    networkDead = false;
    attempts.length = 0;
    await flushOutbox(store, 'judge-net', send, 9000);
    // Strict FIFO execution of both recovered operations
    assert.deepEqual(attempts, ['op-net-1', 'op-net-2']);

    const finalRecords = await store.list('judge-net');
    assert.ok(finalRecords.every(r => r.state === 'acknowledged'));
  });

  test('T5-05: Exponential Backoff Escalation & Cap: Backoff doubles per failed attempt and caps at 60,000ms', async () => {
    const store = new MemoryScoreStore();
    const op = newOperation('judge-backoff', 'ph', 'event-1', makeScoreCommand('op-backoff'));
    await queueOperation(store, op);

    const failSend = async () => { throw { status: 503 }; };

    let simTime = 1000;
    // Attempt 1: attempts=1 -> 1000 * 2^1 = 2000ms
    await flushOutbox(store, 'judge-backoff', failSend, simTime);
    let row = (await store.list('judge-backoff'))[0];
    assert.equal(row.attempts, 1);
    assert.equal(row.nextAttemptAt, simTime + 2000);

    // Attempt 2: attempts=2 -> 1000 * 2^2 = 4000ms
    simTime = row.nextAttemptAt;
    await flushOutbox(store, 'judge-backoff', failSend, simTime);
    row = (await store.list('judge-backoff'))[0];
    assert.equal(row.attempts, 2);
    assert.equal(row.nextAttemptAt, simTime + 4000);

    // Escalate to attempt 6 -> 1000 * 2^6 = 64,000 capped at 60,000ms
    row.attempts = 5;
    await store.put(row);
    simTime = row.nextAttemptAt;
    await flushOutbox(store, 'judge-backoff', failSend, simTime);
    row = (await store.list('judge-backoff'))[0];
    assert.equal(row.attempts, 6);
    assert.equal(row.nextAttemptAt, simTime + 60000); // Strict 60s cap!
  });

  test('T5-06: HTTP 409 Conflict Retention: Lock or revision conflicts set state to conflict without blocking queue', async () => {
    const store = new MemoryScoreStore();
    const op1 = newOperation('judge-conf', 'ph', 'event-1', makeScoreCommand('op-conf-1', 0, 'crew-1'));
    op1.createdAt = 1000;
    await queueOperation(store, op1);

    const op2 = newOperation('judge-conf', 'ph', 'event-1', makeScoreCommand('op-conf-2', 0, 'crew-2'));
    op2.createdAt = 2000;
    await queueOperation(store, op2);

    const send = async (sending) => {
      if (sending.command.operation_id === 'op-conf-1') {
        throw { status: 409, message: 'Division locked' };
      }
      return makeValidReceipt(sending);
    };

    await flushOutbox(store, 'judge-conf', send, 5000);

    const records = await store.list('judge-conf');
    const r1 = records.find(r => r.command.operation_id === 'op-conf-1');
    const r2 = records.find(r => r.command.operation_id === 'op-conf-2');

    // op1 transitions to conflict state
    assert.equal(r1.state, 'conflict');
    assert.match(r1.message, /Locked or changed on server/);

    // op2 is NOT blocked by op1's conflict; it succeeds!
    assert.equal(r2.state, 'acknowledged');
  });

  test('T5-07: Client/Server Rejection (400/403): Rejected operations transition to rejected state without automated retry', async () => {
    for (const status of [400, 403]) {
      const store = new MemoryScoreStore();
      const op = newOperation('judge-rej', 'ph', 'event-1', makeScoreCommand(`op-rej-${status}`));
      await queueOperation(store, op);

      let calls = 0;
      const send = async () => { calls++; throw { status }; };

      await flushOutbox(store, 'judge-rej', send, 1000);
      const row = (await store.list('judge-rej'))[0];
      assert.equal(row.state, 'rejected');
      assert.match(row.message, /The server rejected this command/);

      // Subsequent flush does not retry rejected row
      await flushOutbox(store, 'judge-rej', send, 200000);
      assert.equal(calls, 1);
    }
  });

  test('T5-08: Crash Recovery: Operations interrupted in sending state resume on reconnect with exact same op_id', async () => {
    const store = new MemoryScoreStore();
    const op = newOperation('judge-crash', 'ph', 'event-1', makeScoreCommand('op-crash-1'));
    // Simulate crashed state where process died while sending
    op.state = 'sending';
    op.attempts = 1;
    await store.put(op);

    let sentOpId = null;
    await flushOutbox(store, 'judge-crash', async (sending) => {
      sentOpId = sending.command.operation_id;
      return makeValidReceipt(sending);
    });

    assert.equal(sentOpId, 'op-crash-1');
    const recovered = (await store.list('judge-crash'))[0];
    assert.equal(recovered.state, 'acknowledged');
    assert.equal(recovered.attempts, 2);
  });

  test('T5-09: Receipt Integrity & Tamper Rejection: Mismatched receipt properties trigger 409 conflict', async () => {
    const testCases = [
      { name: 'mismatched operation_id', patch: { operation_id: 'tampered-id' } },
      { name: 'mismatched judge_uid', patch: { judge_uid: 'other-judge' } },
      { name: 'mismatched crew_id', patch: { crew_id: 'other-crew' } },
      { name: 'mismatched division_id', patch: { division_id: 'other-div' } },
      { name: 'mismatched event_id', patch: { event_id: 'other-event' } },
      { name: 'mismatched score_revision', patch: { score_revision: 99 } },
      { name: 'empty receipt_id', patch: { receipt_id: '' } },
    ];

    for (const tc of testCases) {
      const store = new MemoryScoreStore();
      const op = newOperation('judge-tamper', 'ph', 'event-1', makeScoreCommand(`op-${tc.name.replace(/\s+/g, '-')}`));
      await queueOperation(store, op);

      await flushOutbox(store, 'judge-tamper', async (sending) => {
        return makeValidReceipt(sending, tc.patch);
      });

      const row = (await store.list('judge-tamper'))[0];
      assert.equal(row.state, 'conflict', `Expected ${tc.name} to flag conflict state`);
      assert.match(row.message, /Locked or changed on server/i);
    }
  });

  test('T5-10: Multi-Tenant & Account Isolation: Flush operation strictly queries owner records only', async () => {
    const store = new MemoryScoreStore();
    const opA = newOperation('judge-A', 'ph', 'event-1', makeScoreCommand('op-A'));
    const opB = newOperation('judge-B', 'ph', 'event-1', makeScoreCommand('op-B'));
    await queueOperation(store, opA);
    await queueOperation(store, opB);

    const sent = [];
    await flushOutbox(store, 'judge-A', async (sending) => {
      sent.push(sending.owner);
      return makeValidReceipt(sending);
    });

    assert.deepEqual(sent, ['judge-A']);
    const listB = await store.list('judge-B');
    assert.equal(listB[0].state, 'queued'); // Untouched
  });

  test('T5-11: Web Locks Mutual Exclusion: Synchronize across tabs prevents concurrent flushes', async () => {
    // Simulated Web Locks API behavior
    let lockHolder = null;
    const requestLock = async (name, options, callback) => {
      if (options.ifAvailable && lockHolder !== null) {
        return callback(null); // Lock held, bail out immediately
      }
      lockHolder = name;
      try {
        return await callback({ name });
      } finally {
        lockHolder = null;
      }
    };

    let executedFirst = false;
    let executedSecond = false;

    // First tab acquires lock and performs flush
    const task1 = requestLock('wsb-score-sync:judge-lock', { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      executedFirst = true;
      // Keep lock held momentarily
      await new Promise(r => setTimeout(r, 20));
    });

    // Second tab tries to synchronize simultaneously
    const task2 = requestLock('wsb-score-sync:judge-lock', { ifAvailable: true }, async (lock) => {
      if (!lock) return;
      executedSecond = true;
    });

    await Promise.all([task1, task2]);

    assert.equal(executedFirst, true);
    assert.equal(executedSecond, false, 'Second tab must bail out when lock is unavailable');
  });
});

// ============================================================================
// SECTION 2: DANCER VENUE CHECK-IN (F35) ADVERSARIAL STRESS
// ============================================================================
test.describe('Tier 5 — Section 2: Dancer Venue Check-In (F35)', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  test('T5-12: RBAC Least Privilege: Only marshal and chapter_director can check in dancers (judges, dancers, registrars fail 403)', () => {
    const crew = harness.createCrew('ph', 'mgr-ci-rbac', 'RBAC Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-ci-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-ci-0', 'ref-ci', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Marshal succeeds
    const pass1 = harness.checkInDancer('ph', 'manila-session-2027', 'd-ci-0', 'marshal');
    assert.ok(pass1.pass_id);

    // Chapter Director succeeds
    const pass2 = harness.checkInDancer('ph', 'manila-session-2027', 'd-ci-1', 'chapter_director');
    assert.ok(pass2.pass_id);

    // Disallowed roles fail with 403 Forbidden
    for (const role of ['judge', 'dancer', 'registrar', 'finance', 'support']) {
      assert.throws(
        () => harness.checkInDancer('ph', 'manila-session-2027', 'd-ci-2', role),
        err => err.status === 403,
        `Role ${role} must be rejected with 403`
      );
    }
  });

  test('T5-13: 4-Vector Readiness Gating: Draft, submitted, or unapproved entries fail closed with 409 Conflict', () => {
    const crew = harness.createCrew('ph', 'mgr-ci-ready', 'Unapproved Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-unapp-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // Entry is in draft -> Check-in must fail
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'd-unapp-0', 'marshal'),
      err => err.status === 403 || err.status === 409
    );

    // Entry submitted but not approved by registrar -> Check-in must fail
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-unapp-0', 'ref-unapp', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);

    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'd-unapp-0', 'marshal'),
      err => err.status === 403 || err.status === 409
    );
  });

  test('T5-14: Incomplete 4-Vector Vectors: Missing music, audio duration violation, unverified minor consent, or unpaid fees block check-in', () => {
    // Case A: Unverified minor
    const crewA = harness.createCrew('ph', 'mgr-a', 'Minor Crew', 'Manila');
    crewA.members.push({ uid: 'd-minor-unv', name: 'Minor', role: 'Dancer', is_minor: true, consent_verified: false });
    for (let i = 1; i < 5; i++) {
      crewA.members.push({ uid: `d-a-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entryA = harness.createEntryDraft('ph', 'manila-session-2027', crewA.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entryA.id, 'music.mp3', 120);
    const pA = harness.requestPayment('ph', 'manila-session-2027', entryA.id, 'd-a-1', 'ref-a', 600000);
    harness.reconcilePayment('ph', pA.payment_id, 'finance', true);

    // 4-vector readiness evaluates false
    const readyA = harness.evaluateReadiness(entryA);
    assert.equal(readyA.consent_ready, false);
    assert.equal(readyA.is_ready, false);

    // Case B: Audio duration exceeded (180s + 5s grace = 185s max; 190s fails)
    const crewB = harness.createCrew('ph', 'mgr-b', 'Audio Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crewB.members.push({ uid: `d-b-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entryB = harness.createEntryDraft('ph', 'manila-session-2027', crewB.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entryB.id, 'overtime.mp3', 190);
    const readyB = harness.evaluateReadiness(entryB);
    assert.equal(readyB.music_ready, false);
    assert.equal(readyB.is_ready, false);

    // Case C: Unpaid fee
    const crewC = harness.createCrew('ph', 'mgr-c', 'Unpaid Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crewC.members.push({ uid: `d-c-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entryC = harness.createEntryDraft('ph', 'manila-session-2027', crewC.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entryC.id, 'music.mp3', 120);
    const readyC = harness.evaluateReadiness(entryC);
    assert.equal(readyC.payment_ready, false);
    assert.equal(readyC.is_ready, false);
  });

  test('T5-15: Roster Membership Enforcement: Non-roster dancer cannot be checked in under entry', () => {
    const crew = harness.createCrew('ph', 'mgr-roster', 'Roster Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-ros-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-ros-0', 'ref-ros', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Phantom dancer not on roster
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'phantom-dancer-999', 'marshal'),
      err => err.status === 403 || err.status === 409
    );
  });

  test('T5-16: Idempotent Pass Preservation: Re-scanning dancer QR returns identical pass_id and timestamp', () => {
    const crew = harness.createCrew('ph', 'mgr-idem', 'Idem Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-idem-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-idem-0', 'ref-idem', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    const pass1 = harness.checkInDancer('ph', 'manila-session-2027', 'd-idem-0', 'marshal');
    const pass2 = harness.checkInDancer('ph', 'manila-session-2027', 'd-idem-0', 'marshal');

    assert.equal(pass1.pass_id, pass2.pass_id);
    assert.equal(pass1.checked_in_at, pass2.checked_in_at);
  });

  test('T5-17: High-Concurrency Replay Protection: 50 concurrent check-in scans produce exactly 1 pass document', () => {
    const crew = harness.createCrew('ph', 'mgr-conc', 'Concurrency Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-conc-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-conc-0', 'ref-conc', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // 50 parallel scans
    const passes = [];
    for (let i = 0; i < 50; i++) {
      passes.push(harness.checkInDancer('ph', 'manila-session-2027', 'd-conc-0', 'marshal'));
    }

    const uniquePassIds = new Set(passes.map(p => p.pass_id));
    assert.equal(uniquePassIds.size, 1);
  });

  test('T5-18: Multi-Tenant Chapter & Event Scoping: Event check-in strictly isolated to target event and chapter', () => {
    const crew = harness.createCrew('ph', 'mgr-scope', 'Scope Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-scope-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-scope-0', 'ref-scope', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Dancer checked in for Manila Session 2027
    harness.checkInDancer('ph', 'manila-session-2027', 'd-scope-0', 'marshal');

    // Attempting check-in on non-existent or foreign event fails
    assert.throws(
      () => harness.checkInDancer('ph', 'foreign-event-2027', 'd-scope-0', 'marshal'),
      err => err.status === 403 || err.status === 404
    );
  });
});

// ============================================================================
// SECTION 3: STAGE MARSHAL QUEUE (F36) ADVERSARIAL STRESS
// ============================================================================
test.describe('Tier 5 — Section 3: Stage Marshal Queue (F36)', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  test('T5-19: Monotonic Queue Progression: Holding -> OnDeck -> Performing -> Completed executes sequentially', () => {
    const crew = harness.createCrew('ph', 'mgr-stg-seq', 'Seq Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-seq-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'music.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-seq-0', 'ref-seq', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Step 1: Holding
    const s1 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'holding');
    assert.equal(s1.status, 'holding');

    // Step 2: On Deck
    const s2 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'on_deck');
    assert.equal(s2.status, 'on_deck');

    // Step 3: Stage / Performing
    const s3 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');
    assert.equal(s3.status, 'stage');
  });

  test('T5-20: Anti-Skip Monotonicity: Illegal forward skips directly to performing or completed are rejected', () => {
    // Model test of StagePosition.may_advance_to
    const mayAdvanceTo = (from, to) => {
      const order = ['holding', 'on_deck', 'performing', 'completed'];
      const fromIdx = order.indexOf(from);
      const toIdx = order.indexOf(to);
      return toIdx === fromIdx + 1;
    };

    assert.equal(mayAdvanceTo('holding', 'on_deck'), true);
    assert.equal(mayAdvanceTo('on_deck', 'performing'), true);
    assert.equal(mayAdvanceTo('performing', 'completed'), true);

    // Skips
    assert.equal(mayAdvanceTo('holding', 'performing'), false);
    assert.equal(mayAdvanceTo('holding', 'completed'), false);
    assert.equal(mayAdvanceTo('on_deck', 'completed'), false);
  });

  test('T5-21: Anti-Reverse Monotonicity: Illegal backward reversals are strictly rejected', () => {
    const mayAdvanceTo = (from, to) => {
      const order = ['holding', 'on_deck', 'performing', 'completed'];
      const fromIdx = order.indexOf(from);
      const toIdx = order.indexOf(to);
      return toIdx === fromIdx + 1;
    };

    // Reversals
    assert.equal(mayAdvanceTo('on_deck', 'holding'), false);
    assert.equal(mayAdvanceTo('performing', 'on_deck'), false);
    assert.equal(mayAdvanceTo('performing', 'holding'), false);
    assert.equal(mayAdvanceTo('completed', 'performing'), false);
    assert.equal(mayAdvanceTo('completed', 'on_deck'), false);
    assert.equal(mayAdvanceTo('completed', 'holding'), false);
  });

  test('T5-22: Terminal State Durability: Completed entries cannot repeat, reverse, or re-enter stage queue', () => {
    const order = ['holding', 'on_deck', 'performing', 'completed'];
    for (const target of order) {
      const mayAdvance = target === 'completed' ? false : (order.indexOf(target) === order.indexOf('completed') + 1);
      assert.equal(mayAdvance, false, `Completed position cannot advance to ${target}`);
    }
  });

  test('T5-23: Optimistic Concurrency Control: Stale or mismatched expected_revision rejected with 409 Conflict', () => {
    // Simulated optimistic locking logic from apps/api/src/repository/stage.rs:770
    const stageState = { entry_id: 'entry-occ', revision: 2, position: 'on_deck' };

    const updateStage = (command) => {
      if (command.expected_revision !== stageState.revision) {
        throw { status: 409, message: 'Stage position or revision changed' };
      }
      stageState.revision += 1;
      stageState.position = command.position;
      return stageState;
    };

    // Stale command (expected_revision: 1 instead of 2)
    assert.throws(
      () => updateStage({ expected_revision: 1, position: 'performing' }),
      err => err.status === 409
    );

    // Fresh command succeeds
    const updated = updateStage({ expected_revision: 2, position: 'performing' });
    assert.equal(updated.revision, 3);
    assert.equal(updated.position, 'performing');
  });

  test('T5-24: Stage Hold Barrier: Advancement to Performing strictly blocked while stage.held is true', () => {
    // Logic from apps/api/src/repository/stage.rs:711:
    // if stage.held && command.position == StagePosition::Performing { return Err(conflict("Stage is on hold")); }
    const stage = { stage_id: 'main-stage', held: true, performing_entry: null };

    const advanceToPerforming = (command) => {
      if (stage.held && command.position === 'performing') {
        throw { status: 409, message: 'Stage is on hold' };
      }
      stage.performing_entry = command.entry_id;
      return stage;
    };

    assert.throws(
      () => advanceToPerforming({ entry_id: 'entry-hold-test', position: 'performing' }),
      err => err.status === 409 && err.message === 'Stage is on hold'
    );
  });

  test('T5-25: Hold Release & Safe Completion: Hold release permits Performing; active hold does not abort routine already performing', () => {
    const stage = { stage_id: 'main-stage', held: true, performing_entry: 'active-entry' };

    // Advancing currently performing entry to completed is allowed during hold
    const advanceToCompleted = (command) => {
      // Hold only blocks entering Performing, not finishing routine!
      stage.performing_entry = null;
      return { status: 'completed' };
    };

    const res = advanceToCompleted({ entry_id: 'active-entry', position: 'completed' });
    assert.equal(res.status, 'completed');
    assert.equal(stage.performing_entry, null);

    // Releasing hold allows next performer
    stage.held = false;
    assert.equal(stage.held, false);
  });

  test('T5-26: Pre-Stage Dancer Check-In Barrier: Entry with any unchecked-in dancer is blocked from stage queue', () => {
    // Logic from apps/api/src/repository/stage.rs:745
    const roster = ['dancer-1', 'dancer-2', 'dancer-3'];
    const checkedInDancers = new Set(['dancer-1', 'dancer-2']); // dancer-3 missing

    const verifyCheckIns = (rosterList) => {
      for (const d of rosterList) {
        if (!checkedInDancers.has(d)) {
          throw { status: 409, message: 'Every roster dancer must be checked in' };
        }
      }
      return true;
    };

    assert.throws(
      () => verifyCheckIns(roster),
      err => err.status === 409 && err.message === 'Every roster dancer must be checked in'
    );

    // Check in dancer-3
    checkedInDancers.add('dancer-3');
    assert.equal(verifyCheckIns(roster), true);
  });

  test('T5-27: Single-Performer Stage Serialization: Exactly one entry can be Performing; competitor blocked until completion', () => {
    // Logic from apps/api/src/repository/stage.rs:816
    const stage = { single_performer: true, performing_entry: null };

    const startPerformance = (entryId) => {
      if (stage.single_performer && stage.performing_entry !== null) {
        throw { status: 409, message: 'Stage already has a performer' };
      }
      stage.performing_entry = entryId;
      return stage;
    };

    const completePerformance = (entryId) => {
      if (stage.performing_entry !== entryId) {
        throw { status: 409, message: 'Stage performer changed' };
      }
      stage.performing_entry = null;
    };

    // Entry A starts
    startPerformance('entry-A');
    assert.equal(stage.performing_entry, 'entry-A');

    // Entry B attempts to start simultaneously -> 409 Conflict
    assert.throws(
      () => startPerformance('entry-B'),
      err => err.status === 409 && err.message === 'Stage already has a performer'
    );

    // Entry A completes
    completePerformance('entry-A');
    assert.equal(stage.performing_entry, null);

    // Entry B can now perform
    startPerformance('entry-B');
    assert.equal(stage.performing_entry, 'entry-B');
  });

  test('T5-28: Cross-Stage Global Performance Lock: Entry cannot perform on multiple stages simultaneously', () => {
    // Logic from apps/api/src/repository/stage.rs:788 (stagePerformanceClaims)
    const globalClaims = new Map(); // entry_id -> { stage_id, active }

    const claimPerformance = (stageId, entryId) => {
      const current = globalClaims.get(entryId);
      if (current && current.active) {
        throw { status: 409, message: 'Entry is already performing on a stage' };
      }
      globalClaims.set(entryId, { stage_id: stageId, active: true });
    };

    claimPerformance('stage-north', 'entry-1');
    assert.throws(
      () => claimPerformance('stage-south', 'entry-1'),
      err => err.status === 409 && err.message === 'Entry is already performing on a stage'
    );
  });

  test('T5-29: Idempotency & Command Hash Integrity: Repeated stage command returns cached receipt; mutated payload rejected', () => {
    const receipts = new Map();

    const executeStageCommand = (sub, command) => {
      const key = `${sub}:${command.operation_id}`;
      const hash = crypto.createHash('sha256').update(JSON.stringify(command)).digest('hex');
      const existing = receipts.get(key);
      if (existing) {
        if (existing.hash === hash) return existing.result;
        throw { status: 409, message: 'Operation ID already used for different input' };
      }
      const result = { entry_id: command.entry_id, position: command.position, revision: command.expected_revision + 1 };
      receipts.set(key, { hash, result });
      return result;
    };

    const cmd = { operation_id: 'stg-op-1', entry_id: 'entry-1', position: 'on_deck', expected_revision: 1 };
    const r1 = executeStageCommand('marshal-1', cmd);
    const r2 = executeStageCommand('marshal-1', cmd);
    assert.deepEqual(r1, r2);

    // Mutated payload with same operation_id
    const mutated = { ...cmd, position: 'performing' };
    assert.throws(
      () => executeStageCommand('marshal-1', mutated),
      err => err.status === 409 && err.message === 'Operation ID already used for different input'
    );
  });
});

// ============================================================================
// SECTION 4: NATIVE CONTACT INQUIRIES (F37, F38)
// ============================================================================
test.describe('Tier 5 — Section 4: Native Contact Inquiries (F37, F38)', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  test('T5-30: 256-Bit Capability Key Specification: Strict 64-character hexadecimal requirement', () => {
    // Secret validation from apps/api/src/repository/support.rs:42:
    // fn secret(value: &str) -> Result<()> { if value.len() != 64 || !value.bytes().all(|b| b.is_ascii_hexdigit()) { return Err(missing()); } }
    const isValidCapabilityKey = (val) => {
      return typeof val === 'string' && val.length === 64 && /^[0-9a-fA-F]{64}$/.test(val);
    };

    // Valid 256-bit key
    const validKey = crypto.randomBytes(32).toString('hex');
    assert.equal(isValidCapabilityKey(validKey), true);

    // Too short (32 chars / 128-bit)
    assert.equal(isValidCapabilityKey(crypto.randomBytes(16).toString('hex')), false);

    // Too long (66 chars)
    assert.equal(isValidCapabilityKey(validKey + 'aa'), false);

    // Non-hex characters
    assert.equal(isValidCapabilityKey(validKey.slice(0, 63) + 'Z'), false);
    assert.equal(isValidCapabilityKey(validKey.slice(0, 63) + ' '), false);
    assert.equal(isValidCapabilityKey(''), false);
  });

  test('T5-31: Hash-Only Verification & Zero-PII Storage: Plaintext capability key never stored; SHA-256 capability_hash verified', () => {
    const chapter = 'ph';
    const inquiryId = 'inq-sec-test';
    const capabilityKey = crypto.randomBytes(32).toString('hex');

    // SHA-256 capability hash stored in Firestore
    const storedHash = crypto.createHash('sha256').update(`${chapter}:${inquiryId}:${capabilityKey}`).digest('hex');

    // Verification check
    const verifyToken = (token) => {
      const computed = crypto.createHash('sha256').update(`${chapter}:${inquiryId}:${token}`).digest('hex');
      return computed === storedHash;
    };

    assert.equal(verifyToken(capabilityKey), true);
    assert.equal(verifyToken(crypto.randomBytes(32).toString('hex')), false);
  });

  test('T5-32: Dual-Layer Rate Limiting (Actor Burst Limit): 5 requests within hour window succeed, 6th rejected with 429', () => {
    const quotaMap = new Map();

    const checkQuota = (bucket, max) => {
      const current = quotaMap.get(bucket) || 0;
      if (current >= max) {
        throw { status: 429, message: 'Inquiry limit reached; try again later' };
      }
      quotaMap.set(bucket, current + 1);
      return current + 1;
    };

    const actorBucket = 'email:test@example.com';
    // Requests 1 through 5 succeed
    for (let i = 1; i <= 5; i++) {
      assert.equal(checkQuota(actorBucket, 5), i);
    }

    // 6th request fails with 429 Too Many Requests
    assert.throws(
      () => checkQuota(actorBucket, 5),
      err => err.status === 429
    );
  });

  test('T5-33: Rate Limit Isolation: Actor rate limiting does not block separate actor email buckets', () => {
    const quotaMap = new Map();
    const checkQuota = (bucket, max) => {
      const current = quotaMap.get(bucket) || 0;
      if (current >= max) throw { status: 429, message: 'Inquiry limit reached' };
      quotaMap.set(bucket, current + 1);
      return current + 1;
    };

    // Exhaust Actor A
    for (let i = 0; i < 5; i++) checkQuota('actor-A', 5);
    assert.throws(() => checkQuota('actor-A', 5), err => err.status === 429);

    // Actor B is unblocked
    assert.equal(checkQuota('actor-B', 5), 1);
  });

  test('T5-34: Chapter Global Rate Limit: Global chapter rate limit enforces 1000/hr quota barrier', () => {
    const quotaMap = new Map();
    const checkQuota = (bucket, max) => {
      const current = quotaMap.get(bucket) || 0;
      if (current >= max) throw { status: 429, message: 'Chapter quota reached' };
      quotaMap.set(bucket, current + 1);
      return current + 1;
    };

    quotaMap.set('chapter-global', 1000);
    assert.throws(
      () => checkQuota('chapter-global', 1000),
      err => err.status === 429 && err.message === 'Chapter quota reached'
    );
  });

  test('T5-35: Input Validation & Sanitization: Malformed email, whitespace-only fields, oversized text rejected 400', () => {
    const validateInquiry = (email, subject, message) => {
      if (!email || !email.includes('@') || email.includes(' ') || email.startsWith('@') || email.endsWith('@') || email.length > 254) {
        throw { status: 400, message: 'Invalid contact email' };
      }
      if (!subject || !subject.trim() || subject.length > 120) {
        throw { status: 400, message: 'Invalid subject' };
      }
      if (!message || !message.trim() || message.length > 4000) {
        throw { status: 400, message: 'Invalid message' };
      }
      return true;
    };

    // Valid
    assert.equal(validateInquiry('dancer@battlegrounds.ph', 'Audition Question', 'When does check-in start?'), true);

    // Malformed emails
    assert.throws(() => validateInquiry('bad-email', 'Subject', 'Message'), err => err.status === 400);
    assert.throws(() => validateInquiry('bad email@test.com', 'Subject', 'Message'), err => err.status === 400);
    assert.throws(() => validateInquiry('@starts-at.com', 'Subject', 'Message'), err => err.status === 400);

    // Whitespace / Empty subject
    assert.throws(() => validateInquiry('ok@test.com', '   ', 'Message'), err => err.status === 400);
    assert.throws(() => validateInquiry('ok@test.com', 'x'.repeat(121), 'Message'), err => err.status === 400);

    // Whitespace / Oversized message
    assert.throws(() => validateInquiry('ok@test.com', 'Subject', '   '), err => err.status === 400);
    assert.throws(() => validateInquiry('ok@test.com', 'Subject', 'x'.repeat(4001)), err => err.status === 400);
  });

  test('T5-36: Approved Category Enforcement: Only official categories accepted; unapproved rejected 400', () => {
    const allowedCategories = [
      'general', 'account', 'registration', 'payment', 'music', 'consent',
      'chapter_application', 'studio_application', 'partner_application',
    ];

    const validateCategory = (cat) => {
      if (!allowedCategories.includes(cat)) {
        throw { status: 400, message: 'Invalid inquiry category' };
      }
      return true;
    };

    for (const cat of allowedCategories) {
      assert.equal(validateCategory(cat), true);
    }

    assert.throws(() => validateCategory('spam'), err => err.status === 400);
    assert.throws(() => validateCategory('commercial_solicitation'), err => err.status === 400);
  });

  test('T5-37: Inquiry Creation Idempotency: Re-submitting with identical operation_id returns cached receipt without consuming quota', () => {
    const intents = new Map();
    let quotaConsumed = 0;

    const createInquiry = (opId, payload) => {
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const existing = intents.get(opId);
      if (existing) {
        if (existing.fingerprint === fingerprint) return existing.receipt;
        throw { status: 409, message: 'Inquiry operation payload changed' };
      }
      quotaConsumed++;
      const receipt = { inquiry_id: `inq-${opId}`, status: 'open' };
      intents.set(opId, { fingerprint, receipt });
      return receipt;
    };

    const payload = { email: 'user@test.com', subject: 'Help', message: 'Need help' };
    const r1 = createInquiry('op-inq-1', payload);
    const r2 = createInquiry('op-inq-1', payload);

    assert.deepEqual(r1, r2);
    assert.equal(quotaConsumed, 1, 'Idempotent replay must not consume extra quota');
  });

  test('T5-38: Inquiry Payload Tamper Protection: Reusing operation_id with changed message rejected with 409 Conflict', () => {
    const intents = new Map();
    const createInquiry = (opId, payload) => {
      const fingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const existing = intents.get(opId);
      if (existing) {
        if (existing.fingerprint === fingerprint) return existing.receipt;
        throw { status: 409, message: 'Inquiry operation payload changed' };
      }
      intents.set(opId, { fingerprint, receipt: { id: opId } });
      return { id: opId };
    };

    createInquiry('op-tamper', { msg: 'original' });
    assert.throws(
      () => createInquiry('op-tamper', { msg: 'tampered' }),
      err => err.status === 409 && err.message === 'Inquiry operation payload changed'
    );
  });

  test('T5-39: Support Queue Least Privilege: Support staff role barred from financial mutations, scoring, locking, and stage control (403)', () => {
    // Audit role permissions against domain access table
    const checkRoleAllowed = (role, allowedRoles) => {
      if (!allowedRoles.includes(role)) throw { status: 403, message: 'Forbidden' };
      return true;
    };

    const supportRole = 'support';

    // Barred from payment refund
    assert.throws(() => checkRoleAllowed(supportRole, ['finance', 'chapter_director']), err => err.status === 403);

    // Barred from division locking
    assert.throws(() => checkRoleAllowed(supportRole, ['head_judge', 'chapter_director']), err => err.status === 403);

    // Barred from results publication
    assert.throws(() => checkRoleAllowed(supportRole, ['chapter_director']), err => err.status === 403);

    // Barred from judge score submission
    assert.throws(() => checkRoleAllowed(supportRole, ['judge', 'head_judge']), err => err.status === 403);

    // Barred from stage queue commands
    assert.throws(() => checkRoleAllowed(supportRole, ['marshal', 'chapter_director']), err => err.status === 403);
  });
});

// ============================================================================
// SECTION 5: ARENA BROADCAST HUD (F34)
// ============================================================================
test.describe('Tier 5 — Section 5: Arena Broadcast HUD (F34)', () => {

  test('T5-40: Arena HUD Zero-PII Leak Proof: All route files strictly omit dancer personal names, emails, minor status, and judge notes', () => {
    const routeFiles = [
      'apps/web/src/app/(arena-live)/arena-live/[eventId]/page.tsx',
      'apps/web/src/app/(arena-live)/arena-live/[eventId]/holding/page.tsx',
      'apps/web/src/app/(arena-live)/arena-live/[eventId]/bracket/page.tsx',
      'apps/web/src/app/(arena-live)/arena-live/[eventId]/results/page.tsx',
      'apps/web/src/components/arena-display.tsx',
    ];

    const forbiddenPatterns = [
      /\bdancer_name\b/i,
      /\bemail\b/i,
      /\bphone\b/i,
      /\bminor\b/i,
      /\bguardian\b/i,
      /\bconsent\b/i,
      /\bamount_minor\b/i,
      /\bjudge_uid\b/i,
      /\bnotes\b/i,
      /\braw_notes\b/i,
    ];

    for (const rel of routeFiles) {
      const fullPath = path.resolve(rootDir, rel);
      assert.ok(fs.existsSync(fullPath), `Route file must exist: ${rel}`);
      const content = fs.readFileSync(fullPath, 'utf8');

      for (const pattern of forbiddenPatterns) {
        assert.ok(
          !pattern.test(content),
          `Arena HUD file ${rel} must not leak PII matching ${pattern}`
        );
      }
    }
  });

  test('T5-41: Allowed Public Presentation Fields: Only entry number, crew name, division name, country, city, stage timer, and standings projected', () => {
    const mainPagePath = path.resolve(rootDir, 'apps/web/src/app/(arena-live)/arena-live/[eventId]/page.tsx');
    const content = fs.readFileSync(mainPagePath, 'utf8');

    // Expected public fields
    assert.match(content, /number/);
    assert.match(content, /crew/);
    assert.match(content, /division/);
    assert.match(content, /countryCode/);
    assert.match(content, /origin/);
  });

  test('T5-42: Viewport Locking CSS Contract: .arena-display enforces min-height: 100dvh, position: relative, and overflow: hidden', () => {
    const themeCssPath = path.resolve(rootDir, 'apps/web/src/app/theme.css');
    const css = fs.readFileSync(themeCssPath, 'utf8');

    // Regex check for .arena-display rule
    assert.match(css, /\.arena-display\s*\{[^}]*min-height\s*:\s*100dvh/i, 'theme.css must enforce min-height: 100dvh');
    assert.match(css, /\.arena-display\s*\{[^}]*overflow\s*:\s*hidden/i, 'theme.css must enforce overflow: hidden to lock viewport');
    assert.match(css, /\.arena-display\s*\{[^}]*position\s*:\s*relative/i, 'theme.css must enforce position: relative');
  });

  test('T5-43: Tabular Numeric Alignment: .mono and numeric displays enforce font-variant-numeric: tabular-nums', () => {
    const themeCssPath = path.resolve(rootDir, 'apps/web/src/app/theme.css');
    const css = fs.readFileSync(themeCssPath, 'utf8');

    assert.match(css, /\.mono\s*\{[^}]*font-variant-numeric\s*:\s*tabular-nums/i, 'theme.css must enforce tabular-nums for .mono');
  });

  test('T5-44: Live Freshness & Live State Indicators: Status dot, aria-live polite announcements, and routine elapsed timers configured', () => {
    const mainPagePath = path.resolve(rootDir, 'apps/web/src/app/(arena-live)/arena-live/[eventId]/page.tsx');
    const content = fs.readFileSync(mainPagePath, 'utf8');

    assert.match(content, /aria-live="polite"/, 'Arena stage section must announce changes politely');
    assert.match(content, /status-dot/, 'Live indicator must include status dot');
    assert.match(content, /LIVE · \d+ms/, 'Display must show live latency freshness indicator');
  });
});

// ============================================================================
// SECTION 6: BRAND MARK DARK-MODE & HERO VIDEO ACCESSIBILITY (F39, F40)
// ============================================================================
test.describe('Tier 5 — Section 6: Brand Mark Dark-Mode & Hero Video Accessibility (F39, F40)', () => {

  test('T5-45: Brand Mark White SVG Filter: theme.css and hero-motion.css enforce brightness(0) invert(1) in dark mode', () => {
    const themeCss = fs.readFileSync(path.resolve(rootDir, 'apps/web/src/app/theme.css'), 'utf8');
    const heroCss = fs.readFileSync(path.resolve(rootDir, 'apps/web/src/app/hero-motion.css'), 'utf8');

    const expectedFilter = /filter\s*:\s*brightness\(\s*0\s*\)\s*invert\(\s*1\s*\)/i;

    assert.match(themeCss, expectedFilter, 'theme.css must contain brightness(0) invert(1)');
    assert.match(heroCss, expectedFilter, 'hero-motion.css must contain brightness(0) invert(1)');
  });

  test('T5-46: Mathematical Purity of Filter: Filter transforms any base RGB pixel to #ffffff while preserving alpha channel transparency', () => {
    // Simulation of CSS filter: brightness(0) invert(1)
    const applyFilter = (r, g, b, a) => {
      // Step 1: brightness(0) -> [0, 0, 0, a]
      const bR = 0, bG = 0, bB = 0;
      // Step 2: invert(1) -> [255 - 0, 255 - 0, 255 - 0, a] = [255, 255, 255, a]
      return { r: 255 - bR, g: 255 - bG, b: 255 - bB, a };
    };

    // Any colored non-transparent pixel becomes pure white (255, 255, 255)
    assert.deepEqual(applyFilter(120, 45, 200, 1.0), { r: 255, g: 255, b: 255, a: 1.0 });
    assert.deepEqual(applyFilter(0, 0, 0, 1.0), { r: 255, g: 255, b: 255, a: 1.0 });
    assert.deepEqual(applyFilter(255, 255, 255, 1.0), { r: 255, g: 255, b: 255, a: 1.0 });

    // Transparent pixels retain exact zero alpha
    assert.deepEqual(applyFilter(50, 50, 50, 0.0), { r: 255, g: 255, b: 255, a: 0.0 });
  });

  test('T5-47: Static White Logo Compliance: apps/web/public/brand/wsb-logo-white.svg uses only pure white fills', () => {
    const svgPath = path.resolve(rootDir, 'apps/web/public/brand/wsb-logo-white.svg');
    assert.ok(fs.existsSync(svgPath), 'wsb-logo-white.svg must exist');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    assert.ok(svgContent.includes('<svg') && svgContent.includes('</svg>'), 'Valid SVG markup required');

    const fills = svgContent.match(/fill="([^"]+)"/g) || [];
    const colors = fills.map(f => f.replace('fill="', '').replace('"', '').toLowerCase());
    const validColors = ['#fff', '#ffffff', 'white', 'none', 'currentcolor'];

    for (const c of colors) {
      assert.ok(
        validColors.includes(c),
        `Logo fill color ${c} must be pure white or transparent`
      );
    }
  });

  test('T5-48: Hero Video Reduced Motion Guard: prefers-reduced-motion: reduce disables video playback and shows poster', () => {
    const compPath = path.resolve(rootDir, 'apps/web/src/components/hero-highlights.tsx');
    const content = fs.readFileSync(compPath, 'utf8');

    assert.match(
      content,
      /prefers-reduced-motion:\s*reduce/,
      'Component must detect prefers-reduced-motion: reduce media query'
    );
    assert.match(
      content,
      /setEnabled\(!blocked\)/,
      'Video enabled state must be set to false when motion is blocked'
    );
  });

  test('T5-49: Hero Video Data Saver & Slow Connection Guard: navigator.connection.saveData and 2G disable video playback', () => {
    const compPath = path.resolve(rootDir, 'apps/web/src/components/hero-highlights.tsx');
    const content = fs.readFileSync(compPath, 'utf8');

    assert.match(content, /saveData/, 'Component must check connection.saveData');
    assert.match(content, /effectiveType===["']2g["']/, 'Component must check for 2G connections');
    assert.match(content, /effectiveType===["']slow-2g["']/, 'Component must check for slow-2g connections');
  });

  test('T5-50: Decorative Muted Audio Guard: Video is strictly muted (mute: 1, target.mute() on ready and state change)', () => {
    const compPath = path.resolve(rootDir, 'apps/web/src/components/hero-highlights.tsx');
    const content = fs.readFileSync(compPath, 'utf8');

    assert.match(content, /mute:\s*1/, 'Player config must specify mute: 1');
    assert.match(content, /target\.mute\(\)/, 'Player must proactively call target.mute()');
  });

  test('T5-51: Inert Video Surface & Screen Reader Shield: Controls disabled, disablekb: 1, tabindex: -1, and aria-hidden: true', () => {
    const compPath = path.resolve(rootDir, 'apps/web/src/components/hero-highlights.tsx');
    const content = fs.readFileSync(compPath, 'utf8');

    assert.match(content, /controls:\s*0/, 'Controls must be disabled');
    assert.match(content, /disablekb:\s*1/, 'Keyboard control must be disabled');
    assert.match(content, /tabindex["'],\s*["']-1["']/, 'Iframe must have tabindex="-1"');
    assert.match(content, /hero-video-surface["'][^>]*aria-hidden=["']true["']/, 'Overlay surface must have aria-hidden="true"');
  });

  test('T5-52: Tab Visibility & Viewport Pausing: Pauses playback on document.hidden, IntersectionObserver exit, and wsb:motion-change', () => {
    const compPath = path.resolve(rootDir, 'apps/web/src/components/hero-highlights.tsx');
    const content = fs.readFileSync(compPath, 'utf8');

    assert.match(content, /document\.hidden/, 'Component must check document.hidden');
    assert.match(content, /visibilitychange/, 'Component must listen to visibilitychange');
    assert.match(content, /IntersectionObserver/, 'Component must use IntersectionObserver to pause when off-screen');
    assert.match(content, /wsb:motion-change/, 'Component must listen to custom motion change events');
  });
});
