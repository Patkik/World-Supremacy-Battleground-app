// Adversarial Challenge Test Harness for Milestone 4
// BG.ONE Battle Mechanics (Majority Closure, Anti-Tamper, Tie Prevention) & Offline Outbox Sync (FIFO, Idempotency, Backoff)
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const Module = require('node:module');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Dynamically compile and import TypeScript outbox module
const outboxTsPath = path.resolve(projectRoot, 'apps/web/src/lib/judging/outbox.ts');
const outboxSource = fs.readFileSync(outboxTsPath, 'utf8');
const compiledOutbox = ts.transpileModule(outboxSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const outboxMod = new Module(outboxTsPath);
outboxMod._compile(compiledOutbox, outboxTsPath);
const { newOperation, queueOperation, flushOutbox } = outboxMod.exports;

// In-memory score store implementation for outbox tests
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

function createOp(owner = 'staff-judge-1', id = 'op-adv-1', division = 'open-crew', crew = 'crew-alpha', revision = 0) {
  return newOperation(owner, 'ph', 'manila-session-2027', {
    schema_version: 1,
    operation_id: id,
    division_id: division,
    crew_id: crew,
    expected_revision: revision,
    criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
    deductions: [],
  });
}

function makeReceipt(op) {
  return {
    operation_id: op.command.operation_id,
    receipt_id: `rcpt-${op.command.operation_id}`,
    event_id: op.event,
    division_id: op.command.division_id,
    crew_id: op.command.crew_id,
    judge_uid: op.owner,
    score_revision: op.command.expected_revision + 1,
    net_score: 90,
    recorded_at: Date.now(),
  };
}

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function runAdversarialM4Suite() {
  console.log('='.repeat(80));
  console.log('  MILESTONE 4: ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE');
  console.log('  BG.ONE Battle Mechanics & Offline Outbox Synchronization');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Target Workspace: ${projectRoot}`);
  console.log('-'.repeat(80));

  const harness = new SystemHarness();

  // =========================================================================
  // SECTION 1: BG.ONE 3-JUDGE PANEL MAJORITY INVARIANTS
  // =========================================================================
  console.log('\n[SECTION 1] BG.ONE 3-Judge Panel Simple Majority Invariants');
  {
    harness.reset();
    const eventId = 'manila-session-2027';
    const panel3 = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];

    // 1.1 Match creation
    const m1 = harness.createBattle(eventId, 'match-3p-1', 'Breaking', 'Finals', 'Red Champ', 'Blue Champ', panel3);
    record(
      'S1.1: 3-judge match created with active status, 0-0 tallies, null winner',
      m1.status === 'active' && m1.votes_red === 0 && m1.votes_blue === 0 && m1.winner_corner === null,
      `status=${m1.status}, red=${m1.votes_red}, blue=${m1.votes_blue}`
    );

    // 1.2 First vote for red
    const v1 = harness.voteBattle(eventId, 'match-3p-1', 'staff-judge-1', 'red');
    record(
      'S1.2: First vote (1/3) records red vote and keeps match active with null winner',
      v1.status === 'active' && v1.votes_red === 1 && v1.votes_blue === 0 && v1.winner_corner === null,
      `status=${v1.status}, red=${v1.votes_red}, winner=${v1.winner_corner}`
    );

    // 1.3 Second vote for red (majority reached: 2/3)
    const v2 = harness.voteBattle(eventId, 'match-3p-1', 'staff-judge-2', 'red');
    record(
      'S1.3: Second vote (2/3) immediately triggers simple majority closure: status=closed, winner=red',
      v2.status === 'closed' && v2.votes_red === 2 && v2.votes_blue === 0 && v2.winner_corner === 'red',
      `status=${v2.status}, red=${v2.votes_red}, winner=${v2.winner_corner}`
    );

    // 1.4 Post-closure late vote by 3rd judge rejected with 409 Conflict
    let lateVoteRejected = false;
    try {
      harness.voteBattle(eventId, 'match-3p-1', 'staff-judge-3', 'blue');
    } catch (e) {
      if (e.status === 409 && e.message.includes('Battle is already closed')) {
        lateVoteRejected = true;
      }
    }
    record(
      'S1.4: 3rd judge late vote after closure is strictly rejected with 409 Conflict ("Battle is already closed")',
      lateVoteRejected,
      `rejected=${lateVoteRejected}`
    );

    // 1.5 Winner judge re-vote attempt after closure is rejected with 409
    let closedReplayRejected = false;
    try {
      harness.voteBattle(eventId, 'match-3p-1', 'staff-judge-1', 'red');
    } catch (e) {
      if (e.status === 409) closedReplayRejected = true;
    }
    record(
      'S1.5: Winner judge ballot resubmission on closed match returns 409 Conflict (tamper-proof seal)',
      closedReplayRejected,
      `rejected=${closedReplayRejected}`
    );

    // 1.6 Ballot tampering (trying to switch vote from red to blue after submission)
    harness.createBattle(eventId, 'match-3p-switch', 'Breaking', 'Semi', 'Red', 'Blue', panel3);
    harness.voteBattle(eventId, 'match-3p-switch', 'staff-judge-1', 'red');
    let ballotSwitchRejected = false;
    try {
      harness.voteBattle(eventId, 'match-3p-switch', 'staff-judge-1', 'blue');
    } catch (e) {
      if (e.status === 409 && e.message.includes('Judge cannot change corner ballot once submitted')) {
        ballotSwitchRejected = true;
      }
    }
    record(
      'S1.6: Active match ballot switch attempt (red -> blue) rejected with 409 Conflict',
      ballotSwitchRejected,
      `rejected=${ballotSwitchRejected}`
    );

    // 1.7 Split decision: Red, Blue, Red -> closes on vote 3 with winner 'red' (2-1)
    harness.createBattle(eventId, 'match-3p-split-red', 'Breaking', 'Finals', 'Red', 'Blue', panel3);
    harness.voteBattle(eventId, 'match-3p-split-red', 'staff-judge-1', 'red');
    const midSplit = harness.voteBattle(eventId, 'match-3p-split-red', 'staff-judge-2', 'blue');
    assert.equal(midSplit.status, 'active');
    assert.equal(midSplit.votes_red, 1);
    assert.equal(midSplit.votes_blue, 1);
    const finalSplitRed = harness.voteBattle(eventId, 'match-3p-split-red', 'staff-judge-3', 'red');
    record(
      'S1.7: 3-judge split decision (Red, Blue, Red) closes on 3rd vote with 2-1 majority for red',
      finalSplitRed.status === 'closed' && finalSplitRed.winner_corner === 'red' && finalSplitRed.votes_red === 2 && finalSplitRed.votes_blue === 1,
      `status=${finalSplitRed.status}, winner=${finalSplitRed.winner_corner}, 2-1`
    );

    // 1.8 Split decision: Blue, Red, Blue -> closes on vote 3 with winner 'blue' (1-2)
    harness.createBattle(eventId, 'match-3p-split-blue', 'Breaking', 'Finals', 'Red', 'Blue', panel3);
    harness.voteBattle(eventId, 'match-3p-split-blue', 'staff-judge-1', 'blue');
    harness.voteBattle(eventId, 'match-3p-split-blue', 'staff-judge-2', 'red');
    const finalSplitBlue = harness.voteBattle(eventId, 'match-3p-split-blue', 'staff-judge-3', 'blue');
    record(
      'S1.8: 3-judge split decision (Blue, Red, Blue) closes on 3rd vote with 1-2 majority for blue',
      finalSplitBlue.status === 'closed' && finalSplitBlue.winner_corner === 'blue' && finalSplitBlue.votes_red === 1 && finalSplitBlue.votes_blue === 2,
      `status=${finalSplitBlue.status}, winner=${finalSplitBlue.winner_corner}, 1-2`
    );

    // 1.9 Blue sweep: Blue, Blue -> closes immediately on 2nd vote (0-2)
    harness.createBattle(eventId, 'match-3p-sweep-blue', 'Breaking', 'Finals', 'Red', 'Blue', panel3);
    harness.voteBattle(eventId, 'match-3p-sweep-blue', 'staff-judge-1', 'blue');
    const sweepBlue = harness.voteBattle(eventId, 'match-3p-sweep-blue', 'staff-judge-2', 'blue');
    record(
      'S1.9: 3-judge blue sweep (Blue, Blue) closes immediately on 2nd vote without needing 3rd vote',
      sweepBlue.status === 'closed' && sweepBlue.winner_corner === 'blue' && sweepBlue.votes_blue === 2,
      `status=${sweepBlue.status}, winner=${sweepBlue.winner_corner}, 0-2`
    );
  }

  // =========================================================================
  // SECTION 2: BG.ONE 5-JUDGE PANEL MAJORITY INVARIANTS
  // =========================================================================
  console.log('\n[SECTION 2] BG.ONE 5-Judge Panel Simple Majority Invariants');
  {
    harness.reset();
    const eventId = 'manila-session-2027';
    const panel5 = ['j1', 'j2', 'j3', 'j4', 'j5'];

    // 2.1 5-judge match creation
    const m5 = harness.createBattle(eventId, 'match-5p-1', 'Breaking', 'Finals', 'Red 5P', 'Blue 5P', panel5);
    record(
      'S2.1: 5-judge match created with 5 judges, active status, null winner',
      m5.panel.length === 5 && m5.status === 'active' && m5.winner_corner === null,
      `panel_len=${m5.panel.length}, status=${m5.status}`
    );

    // 2.2 Votes 1 and 2 for Red (2-0) — MUST NOT CLOSE (threshold is 3!)
    harness.voteBattle(eventId, 'match-5p-1', 'j1', 'red');
    const v2 = harness.voteBattle(eventId, 'match-5p-1', 'j2', 'red');
    record(
      'S2.2: 5-judge panel with 2 votes for Red remains active (2/5 does NOT close match)',
      v2.status === 'active' && v2.votes_red === 2 && v2.winner_corner === null,
      `status=${v2.status}, red=${v2.votes_red}, winner=${v2.winner_corner}`
    );

    // 2.3 Vote 3 for Blue (2-1) — MUST REMAIN ACTIVE
    const v3 = harness.voteBattle(eventId, 'match-5p-1', 'j3', 'blue');
    record(
      'S2.3: 5-judge panel with 2 Red, 1 Blue remains active (no majority yet)',
      v3.status === 'active' && v3.votes_red === 2 && v3.votes_blue === 1 && v3.winner_corner === null,
      `status=${v3.status}, red=2, blue=1`
    );

    // 2.4 Vote 4 for Red (3-1) — REACHES MAJORITY (3/5) -> MUST CLOSE IMMEDIATELY
    const v4 = harness.voteBattle(eventId, 'match-5p-1', 'j4', 'red');
    record(
      'S2.4: 5-judge panel 4th vote (3 Red, 1 Blue) reaches simple majority (3/5) and closes immediately',
      v4.status === 'closed' && v4.winner_corner === 'red' && v4.votes_red === 3 && v4.votes_blue === 1,
      `status=${v4.status}, winner=${v4.winner_corner}, red=3, blue=1`
    );

    // 2.5 5th judge late vote after closure is rejected with 409 Conflict
    let j5Rejected = false;
    try {
      harness.voteBattle(eventId, 'match-5p-1', 'j5', 'blue');
    } catch (e) {
      if (e.status === 409 && e.message.includes('Battle is already closed')) {
        j5Rejected = true;
      }
    }
    record(
      'S2.5: 5th judge late vote after 3-1 closure rejected with 409 Conflict',
      j5Rejected,
      `rejected=${j5Rejected}`
    );

    // 2.6 5-judge Blue sweep (Blue, Blue, Blue) -> closes on 3rd vote (0-3)
    harness.createBattle(eventId, 'match-5p-sweep', 'Breaking', 'Finals', 'Red', 'Blue', panel5);
    harness.voteBattle(eventId, 'match-5p-sweep', 'j1', 'blue');
    harness.voteBattle(eventId, 'match-5p-sweep', 'j2', 'blue');
    const sweep5Blue = harness.voteBattle(eventId, 'match-5p-sweep', 'j3', 'blue');
    record(
      'S2.6: 5-judge blue sweep (0-3) closes immediately on 3rd vote without waiting for judges 4 and 5',
      sweep5Blue.status === 'closed' && sweep5Blue.winner_corner === 'blue' && sweep5Blue.votes_blue === 3,
      `status=${sweep5Blue.status}, winner=${sweep5Blue.winner_corner}, 0-3`
    );

    // 2.7 Judges 4 and 5 are rejected on sweep
    let j4Rejected = false;
    let j5SweepRejected = false;
    try {
      harness.voteBattle(eventId, 'match-5p-sweep', 'j4', 'red');
    } catch (e) {
      if (e.status === 409) j4Rejected = true;
    }
    try {
      harness.voteBattle(eventId, 'match-5p-sweep', 'j5', 'blue');
    } catch (e) {
      if (e.status === 409) j5SweepRejected = true;
    }
    record(
      'S2.7: Judges 4 and 5 rejected with 409 Conflict after 3-0 sweep closure',
      j4Rejected && j5SweepRejected,
      `j4_rejected=${j4Rejected}, j5_rejected=${j5SweepRejected}`
    );

    // 2.8 5-judge full split (Red, Blue, Red, Blue, Red) -> closes on 5th vote (3-2)
    harness.createBattle(eventId, 'match-5p-full-split', 'Breaking', 'Finals', 'Red', 'Blue', panel5);
    harness.voteBattle(eventId, 'match-5p-full-split', 'j1', 'red');
    harness.voteBattle(eventId, 'match-5p-full-split', 'j2', 'blue');
    harness.voteBattle(eventId, 'match-5p-full-split', 'j3', 'red');
    const splitAt4 = harness.voteBattle(eventId, 'match-5p-full-split', 'j4', 'blue');
    assert.equal(splitAt4.status, 'active');
    assert.equal(splitAt4.votes_red, 2);
    assert.equal(splitAt4.votes_blue, 2);
    assert.equal(splitAt4.winner_corner, null);
    const final5Split = harness.voteBattle(eventId, 'match-5p-full-split', 'j5', 'red');
    record(
      'S2.8: 5-judge full split (Red, Blue, Red, Blue, Red) closes on 5th vote with 3-2 majority for Red',
      final5Split.status === 'closed' && final5Split.winner_corner === 'red' && final5Split.votes_red === 3 && final5Split.votes_blue === 2,
      `status=${final5Split.status}, winner=${final5Split.winner_corner}, 3-2`
    );
  }

  // =========================================================================
  // SECTION 3: ILLEGAL CORNERS, BOUNDARY CONDITIONS & ACCESS CONTROL
  // =========================================================================
  console.log('\n[SECTION 3] Illegal Corners, Boundary Conditions & Access Control');
  {
    harness.reset();
    const eventId = 'manila-session-2027';
    const panel = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];
    harness.createBattle(eventId, 'match-illegal', 'Breaking', 'Finals', 'Red', 'Blue', panel);

    const illegalCorners = ['draw', 'tie', 'green', 'RED', 'BLUE', '', ' ', 'red\0null', 'yellow'];
    let allIllegalRejected = true;
    for (const corner of illegalCorners) {
      try {
        harness.voteBattle(eventId, 'match-illegal', 'staff-judge-1', corner);
        allIllegalRejected = false;
        record(`S3.1: Illegal corner "${corner}" was NOT rejected`, false, 'Expected 400 Bad Request');
      } catch (e) {
        if (e.status !== 400) {
          allIllegalRejected = false;
        }
      }
    }
    record(
      'S3.1: All 9 illegal corner strings ("draw", "tie", "green", "RED", etc.) rejected with 400 Bad Request',
      allIllegalRejected,
      `tested=${illegalCorners.length} variants`
    );

    // 3.2 Unassigned judge
    let unassignedRejected = false;
    try {
      harness.voteBattle(eventId, 'match-illegal', 'unassigned-uid', 'red');
    } catch (e) {
      if (e.status === 403 && e.message.includes('Judge not on battle panel')) {
        unassignedRejected = true;
      }
    }
    record(
      'S3.2: Non-panel member judge voting rejected with 403 Forbidden',
      unassignedRejected,
      `rejected=${unassignedRejected}`
    );

    // 3.3 Non-existent match retrieval & voting
    let missingGetRejected = false;
    let missingVoteRejected = false;
    try {
      harness.getBattle(eventId, 'ghost-match-999');
    } catch (e) {
      if (e.status === 404) missingGetRejected = true;
    }
    try {
      harness.voteBattle(eventId, 'ghost-match-999', 'staff-judge-1', 'red');
    } catch (e) {
      if (e.status === 404) missingVoteRejected = true;
    }
    record(
      'S3.3: Non-existent match GET and POST /vote rejected with 404 Not Found',
      missingGetRejected && missingVoteRejected,
      `get_404=${missingGetRejected}, vote_404=${missingVoteRejected}`
    );

    // 3.4 Cross-event match access
    let crossEventRejected = false;
    try {
      harness.voteBattle('other-event-hk', 'match-illegal', 'staff-judge-1', 'red');
    } catch (e) {
      if (e.status === 404) crossEventRejected = true;
    }
    record(
      'S3.4: Voting on match with mismatched event ID fails closed with 404 Not Found',
      crossEventRejected,
      `rejected=${crossEventRejected}`
    );
  }

  // =========================================================================
  // SECTION 4: OFFLINE OUTBOX FIFO REPLAY & DETERMINISTIC ORDERING
  // =========================================================================
  console.log('\n[SECTION 4] Offline Outbox FIFO Replay & Ordering');
  {
    const store = new MemoryScoreStore();
    const owner = 'staff-judge-fifo';

    // Create 5 operations with scrambled timestamps
    const op1 = createOp(owner, 'op-1', 'open-crew', 'crew-1', 0); op1.createdAt = 1000;
    const op2 = createOp(owner, 'op-2', 'open-crew', 'crew-2', 0); op2.createdAt = 2000;
    const op3 = createOp(owner, 'op-3', 'open-crew', 'crew-3', 0); op3.createdAt = 3000;
    const op4 = createOp(owner, 'op-4', 'open-crew', 'crew-4', 0); op4.createdAt = 4000;
    const op5 = createOp(owner, 'op-5', 'open-crew', 'crew-5', 0); op5.createdAt = 5000;

    // Queue in intentionally scrambled order: op3, op1, op5, op2, op4
    await queueOperation(store, op3);
    await queueOperation(store, op1);
    await queueOperation(store, op5);
    await queueOperation(store, op2);
    await queueOperation(store, op4);

    // Track dispatch order during flush
    const dispatchedOrder = [];
    await flushOutbox(store, owner, async (record) => {
      dispatchedOrder.push(record.command.operation_id);
      return makeReceipt(record);
    });

    const expectedOrder = ['op-1', 'op-2', 'op-3', 'op-4', 'op-5'];
    const isStrictFIFO = JSON.stringify(dispatchedOrder) === JSON.stringify(expectedOrder);
    record(
      'S4.1: Scrambled outbox operations are dispatched in strict ascending chronological FIFO order',
      isStrictFIFO,
      `order=[${dispatchedOrder.join(', ')}]`
    );

    // Verify all marked as acknowledged
    const allRows = await store.list(owner);
    const allAcked = allRows.every(r => r.state === 'acknowledged' && r.receipt?.receipt_id);
    record(
      'S4.2: All successfully dispatched FIFO operations transition to "acknowledged" with server receipts',
      allAcked && allRows.length === 5,
      `acknowledged_count=${allRows.filter(r => r.state === 'acknowledged').length}`
    );

    // 4.3 Mid-queue network failure: Op 1 succeeds, Op 2 disconnects -> Op 3,4,5 NOT sent out of order
    const storeFail = new MemoryScoreStore();
    const fOp1 = createOp(owner, 'f-op-1', 'open-crew', 'c1', 0); fOp1.createdAt = 100;
    const fOp2 = createOp(owner, 'f-op-2', 'open-crew', 'c2', 0); fOp2.createdAt = 200;
    const fOp3 = createOp(owner, 'f-op-3', 'open-crew', 'c3', 0); fOp3.createdAt = 300;
    await queueOperation(storeFail, fOp1);
    await queueOperation(storeFail, fOp2);
    await queueOperation(storeFail, fOp3);

    const failDispatchList = [];
    await flushOutbox(storeFail, owner, async (record) => {
      failDispatchList.push(record.command.operation_id);
      if (record.command.operation_id === 'f-op-2') {
        throw new Error('Connection timed out');
      }
      return makeReceipt(record);
    }, 1000);

    const failRows = await storeFail.list(owner);
    const r1 = failRows.find(r => r.command.operation_id === 'f-op-1');
    const r2 = failRows.find(r => r.command.operation_id === 'f-op-2');
    const r3 = failRows.find(r => r.command.operation_id === 'f-op-3');

    const preservedFIFOAfterFail =
      failDispatchList.length === 2 && // only op1 and op2 attempted
      r1.state === 'acknowledged' &&
      r2.state === 'queued' &&
      r3.state === 'queued' && // op3 was NOT dispatched out of order
      r2.nextAttemptAt > 1000;

    record(
      'S4.3: Mid-queue network failure on item 2 halts flush immediately without sending items 3+ out of order',
      preservedFIFOAfterFail,
      `dispatched=[${failDispatchList.join(', ')}], r1=${r1.state}, r2=${r2.state}, r3=${r3.state}`
    );
  }

  // =========================================================================
  // SECTION 5: OPERATION ID IDEMPOTENCY & IMMUTABILITY
  // =========================================================================
  console.log('\n[SECTION 5] Operation ID Idempotency & Immutability');
  {
    const store = new MemoryScoreStore();
    const owner = 'staff-judge-idem';

    // 5.1 Replay of lost acknowledgement preserves identical operation ID
    const row = createOp(owner, 'op-lost-ack', 'open-crew', 'c-idem', 0);
    await queueOperation(store, row);

    const serverStore = new Map();
    let serverInvocations = 0;
    const sendScore = async (op) => {
      serverInvocations++;
      if (!serverStore.has(op.command.operation_id)) {
        serverStore.set(op.command.operation_id, makeReceipt(op));
      }
      return serverStore.get(op.command.operation_id);
    };

    // First flush commits to server but client crashes / simulates lost connection
    let droppedConnection = true;
    await flushOutbox(store, owner, async (op) => {
      const rcpt = await sendScore(op);
      if (droppedConnection) throw new Error('Client connection reset before receiving ack');
      return rcpt;
    }, 1000);

    const stateAfterDrop = (await store.list(owner))[0];
    assert.equal(stateAfterDrop.state, 'queued');
    assert.equal(serverStore.size, 1);

    // Replay flush after reconnection
    droppedConnection = false;
    await flushOutbox(store, owner, sendScore, 100000);

    const stateAfterReplay = (await store.list(owner))[0];
    const singleServerEffect = serverStore.size === 1 && serverInvocations === 2 && stateAfterReplay.state === 'acknowledged';
    record(
      'S5.1: Lost ACK replay resends identical operation_id and retrieves cached receipt with single server effect',
      singleServerEffect,
      `server_entries=${serverStore.size}, invocations=${serverInvocations}, state=${stateAfterReplay.state}`
    );

    // 5.2 Command immutability
    const origOp = createOp(owner, 'op-immutable-1', 'open-crew', 'crew-imm', 0);
    await queueOperation(store, origOp);

    const tamperedOp = structuredClone(origOp);
    tamperedOp.command.criteria.execution = 20; // Alter score from 18 to 20
    let immutabilityGuarded = false;
    try {
      await queueOperation(store, tamperedOp);
    } catch (e) {
      if (e.message.includes('A saved command cannot be changed')) {
        immutabilityGuarded = true;
      }
    }
    record(
      'S5.2: Mutating payload of already-queued operation ID throws "A saved command cannot be changed"',
      immutabilityGuarded,
      `guarded=${immutabilityGuarded}`
    );

    // 5.3 Mismatched receipt detection (receipt spoofing / corruption)
    const spoofTestCases = [
      { field: 'operation_id', val: 'spoofed-op-id' },
      { field: 'judge_uid', val: 'other-judge-uid' },
      { field: 'event_id', val: 'corrupted-event' },
      { field: 'crew_id', val: 'wrong-crew' },
      { field: 'division_id', val: 'wrong-division' },
      { field: 'score_revision', val: 999 },
    ];

    let allSpoofsCaught = true;
    for (const testCase of spoofTestCases) {
      const spoofStore = new MemoryScoreStore();
      const op = createOp(owner, `op-spoof-${testCase.field}`, 'open-crew', 'c-spoof', 0);
      await queueOperation(spoofStore, op);

      await flushOutbox(spoofStore, owner, async (record) => {
        const rcpt = makeReceipt(record);
        rcpt[testCase.field] = testCase.val;
        return rcpt;
      });

      const updated = (await spoofStore.list(owner))[0];
      if (updated.state !== 'conflict') {
        allSpoofsCaught = false;
        record(`S5.3: Mismatched ${testCase.field} was NOT flagged as conflict`, false, `state=${updated.state}`);
      }
    }
    record(
      'S5.3: Outbox client validates server receipt fields and flags mismatches as 409 conflict state',
      allSpoofsCaught,
      `checked=${spoofTestCases.length} receipt fields`
    );
  }

  // =========================================================================
  // SECTION 6: ERROR HANDLING & NON-POISONOUS BACKOFF
  // =========================================================================
  console.log('\n[SECTION 6] Error Handling & Non-Poisonous Backoff');
  {
    const owner = 'staff-judge-err';

    // 6.1 HTTP 403 Forbidden -> 'rejected', does not loop
    {
      const store = new MemoryScoreStore();
      const op = createOp(owner, 'op-403', 'open-crew', 'c1', 0);
      await queueOperation(store, op);

      let calls = 0;
      const send = async () => { calls++; throw { status: 403 }; };
      await flushOutbox(store, owner, send, 1000);
      await flushOutbox(store, owner, send, 100000); // 2nd flush should skip rejected item

      const row = (await store.list(owner))[0];
      const pass403 = calls === 1 && row.state === 'rejected';
      record(
        'S6.1: HTTP 403 Forbidden marks command as "rejected" and never retries automatically',
        pass403,
        `calls=${calls}, state=${row.state}`
      );
    }

    // 6.2 HTTP 409 Conflict -> 'conflict', does not loop
    {
      const store = new MemoryScoreStore();
      const op = createOp(owner, 'op-409', 'open-crew', 'c1', 0);
      await queueOperation(store, op);

      let calls = 0;
      const send = async () => { calls++; throw { status: 409 }; };
      await flushOutbox(store, owner, send, 1000);
      await flushOutbox(store, owner, send, 100000);

      const row = (await store.list(owner))[0];
      const pass409 = calls === 1 && row.state === 'conflict';
      record(
        'S6.2: HTTP 409 Conflict marks command as "conflict" for head judge review and never retries',
        pass409,
        `calls=${calls}, state=${row.state}`
      );
    }

    // 6.3 HTTP 400 Bad Request -> 'rejected', does not loop
    {
      const store = new MemoryScoreStore();
      const op = createOp(owner, 'op-400', 'open-crew', 'c1', 0);
      await queueOperation(store, op);

      let calls = 0;
      const send = async () => { calls++; throw { status: 400 }; };
      await flushOutbox(store, owner, send, 1000);
      await flushOutbox(store, owner, send, 100000);

      const row = (await store.list(owner))[0];
      const pass400 = calls === 1 && row.state === 'rejected';
      record(
        'S6.3: HTTP 400 Bad Request marks command as "rejected" without queue poison loops',
        pass400,
        `calls=${calls}, state=${row.state}`
      );
    }

    // 6.4 Exponential backoff progression on transient errors (503, 429, 401, timeout)
    {
      const store = new MemoryScoreStore();
      const op = createOp(owner, 'op-backoff', 'open-crew', 'c1', 0);
      await queueOperation(store, op);

      const backoffs = [];
      let now = 1000;
      for (let attempt = 1; attempt <= 4; attempt++) {
        await flushOutbox(store, owner, async () => { throw { status: 503 }; }, now);
        const row = (await store.list(owner))[0];
        backoffs.push(row.nextAttemptAt - now);
        now = row.nextAttemptAt + 1; // Advance clock past backoff
      }

      // Expected backoff: 2000ms (2^1 * 1000), 4000ms (2^2 * 1000), 8000ms (2^3 * 1000), 16000ms (2^4 * 1000)
      const validBackoff = backoffs[0] === 2000 && backoffs[1] === 4000 && backoffs[2] === 8000 && backoffs[3] === 16000;
      record(
        'S6.4: Transient errors (503) trigger true exponential backoff without dropping commands (2s, 4s, 8s, 16s)',
        validBackoff,
        `delays=[${backoffs.join(', ')}] ms`
      );
    }

    // 6.5 Cross-account tenant isolation in outbox
    {
      const store = new MemoryScoreStore();
      const opJudgeA = createOp('judge-A', 'op-A', 'open-crew', 'c1', 0);
      const opJudgeB = createOp('judge-B', 'op-B', 'open-crew', 'c2', 0);
      await queueOperation(store, opJudgeA);
      await queueOperation(store, opJudgeB);

      let leakedDispatches = 0;
      await flushOutbox(store, 'judge-A', async (record) => {
        if (record.owner !== 'judge-A') leakedDispatches++;
        return makeReceipt(record);
      });

      const listB = await store.list('judge-B');
      const passIsolation = leakedDispatches === 0 && listB[0].state === 'queued';
      record(
        'S6.5: Cross-account tenant isolation guarantees Judge A flush never dispatches Judge B commands',
        passIsolation,
        `leaked=${leakedDispatches}, judgeB_state=${listB[0].state}`
      );
    }
  }

  // =========================================================================
  // SECTION 7: LIVE RUST AXUM API SERVER INTEGRATION
  // =========================================================================
  console.log('\n[SECTION 7] Live Rust Axum API Server Empirical Attacks');
  const PORT = 8098;
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const exePath = path.join(projectRoot, 'target', 'debug', 'wsb-api.exe');

  console.log(`Spawning ${exePath} on port ${PORT}...`);
  const serverProcess = spawn(exePath, [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WSB_STORAGE: 'memory',
      FIREBASE_PROJECT_ID: 'demo-wsb',
    },
    stdio: 'ignore',
  });

  try {
    let online = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch(`${BASE_URL}/healthz`);
        if (res.status === 200) {
          online = true;
          break;
        }
      } catch {}
    }

    if (!online) {
      throw new Error(`Rust Axum API failed to respond on port ${PORT}`);
    }
    console.log(`Live Rust API is responsive at ${BASE_URL}\n`);

    // 7.1 GET /v1/events/manila-session-2027/battles
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles`);
      const json = await res.json();
      const pass = res.status === 200 && Array.isArray(json) && json.some(m => m.match_id === 'match-101');
      record(
        'S7.1: Live Axum GET /battles returns 200 OK and lists seeded match-101',
        pass,
        `status=${res.status}, count=${json.length}`
      );
    }

    // 7.2 GET /v1/events/manila-session-2027/battles/match-101
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles/match-101`);
      const json = await res.json();
      const pass = res.status === 200 && json.match_id === 'match-101' && json.status === 'active';
      record(
        'S7.2: Live Axum GET /battles/match-101 returns 200 OK with active status',
        pass,
        `status=${res.status}, match_status=${json.status}`
      );
    }

    // 7.3 GET non-existent match returns 404
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles/ghost-match-xyz`);
      const pass = res.status === 404;
      record(
        'S7.3: Live Axum GET /battles/ghost-match-xyz returns 404 NOT_FOUND',
        pass,
        `status=${res.status}`
      );
    }

    // 7.4 Unauthenticated POST /vote returns 401
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles/match-101/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner_corner: 'red' }),
      });
      const pass = res.status === 401;
      record(
        'S7.4: Unauthenticated POST /battles/match-101/vote rejected with 401 UNAUTHORIZED',
        pass,
        `status=${res.status}`
      );
    }

    // 7.5 Malformed token POST /vote returns 401
    {
      const res = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles/match-101/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer malformed.invalid.token',
        },
        body: JSON.stringify({ winner_corner: 'red' }),
      });
      const pass = res.status === 401;
      record(
        'S7.5: Forged Bearer token on POST /battles/match-101/vote rejected with 401 UNAUTHORIZED',
        pass,
        `status=${res.status}`
      );
    }

    // 7.6 Universal Cache-Control: no-store verification across live battle routes
    {
      const resBattles = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles`);
      const resSingle = await fetch(`${BASE_URL}/v1/events/manila-session-2027/battles/match-101`);
      const ccBattles = resBattles.headers.get('cache-control');
      const ccSingle = resSingle.headers.get('cache-control');
      const passNoStore = ccBattles === 'no-store' && ccSingle === 'no-store';
      record(
        'S7.6: Live battle endpoints strictly include "Cache-Control: no-store"',
        passNoStore,
        `battles_cc=${ccBattles}, single_cc=${ccSingle}`
      );
    }

  } finally {
    console.log('\nShutting down live Rust Axum server process...');
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        serverProcess.kill();
      }
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('  MILESTONE 4 ADVERSARIAL CHALLENGE EXECUTION SUMMARY');
  console.log('='.repeat(80));
  const failed = results.filter(r => !r.passed);
  console.log(`Total Attack Scenarios: ${results.length}`);
  console.log(`Passed (Repelled):       ${results.length - failed.length}`);
  console.log(`Failed (Vulnerabilities): ${failed.length}`);
  console.log('='.repeat(80));

  if (failed.length > 0) {
    console.error('\nVULNERABILITIES CONFIRMED:');
    for (const f of failed) {
      console.error(`  - ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL ATTACKS REPELLED CLEANLY! Deterministic exit code: 0\n');
    process.exit(0);
  }
}

runAdversarialM4Suite().catch((err) => {
  console.error('Fatal adversarial runner error:', err);
  process.exit(1);
});
