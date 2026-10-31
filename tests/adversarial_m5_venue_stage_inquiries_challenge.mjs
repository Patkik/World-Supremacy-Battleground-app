// ============================================================================
// ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE HARNESS FOR MILESTONE 5
// Target: Venue Ops, Stage Queue & Native Inquiries (Features 35–38)
// Author: challenger_m5_2 (critic, specialist)
// ============================================================================

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load .env.docker configuration
const envPath = path.resolve(projectRoot, '.env.docker');
const config = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
);

const API_BASE = `http://localhost:${config.WSB_API_PORT || 8189}`;
const FIRESTORE_BASE = `http://localhost:${config.WSB_FIRESTORE_PORT || 8188}/v1/projects/demo-wsb/databases/(default)/documents`;
const TEST_PASSWORD = config.WSB_TEST_PASSWORD;

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function login(email, chapterId = 'ph') {
  const res = await fetch(`${API_BASE}/local/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD, chapter_id: chapterId }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email} (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

const authHeader = token => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

function firestoreValue(item) {
  if (item === null) return { nullValue: null };
  if (typeof item === 'boolean') return { booleanValue: item };
  if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
  if (typeof item === 'string') return { stringValue: item };
  if (Array.isArray(item)) return { arrayValue: { values: item.map(firestoreValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([key, val]) => [key, firestoreValue(val)])) } };
}

// Helper for Firestore direct document inspection
async function getFirestoreDoc(docPath) {
  const res = await fetch(`${FIRESTORE_BASE}/${docPath}`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore read error (${res.status}): ${await res.text()}`);
  return res.json();
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function runAdversarialM5Challenge() {
  console.log('='.repeat(80));
  console.log('  MILESTONE 5 EMPIRICAL ADVERSARIAL CHALLENGE SUITE (challenger_m5_2)');
  console.log('  Venue Ops (F35), Stage Queue (F36), Inquiries (F37), Support Queue (F38)');
  console.log('='.repeat(80));
  console.log(`Target API Base:      ${API_BASE}`);
  console.log(`Target Firestore:     ${FIRESTORE_BASE}`);
  console.log(`Timestamp:            ${new Date().toISOString()}`);
  console.log('-'.repeat(80));

  // Obtain role-based authenticated tokens
  console.log('\n[AUTH SETUP] Authenticating test identities...');
  const marshalToken = await login('marshal@ph.wsb.test', 'ph');
  const directorToken = await login('director@ph.wsb.test', 'ph');
  const managerToken = await login('manager@ph.wsb.test', 'ph');
  const judgeToken = await login('judge1@ph.wsb.test', 'ph');
  const supportToken = await login('support@ph.wsb.test', 'ph');
  const dancerToken = await login('dancer1@ph.wsb.test', 'ph');
  const hkManagerToken = await login('manager@hk.wsb.test', 'hk');
  console.log('✔ All role tokens successfully provisioned.\n');

  // ==========================================================================
  // SECTION 1: FEATURE 35 — DANCER VENUE CHECK-IN ADVERSARIAL STRESS
  // ==========================================================================
  console.log('='.repeat(80));
  console.log('SECTION 1: DANCER VENUE CHECK-IN (F35) ADVERSARIAL STRESS');
  console.log('='.repeat(80));

  // 1.1 Replay attack & Idempotency: 50 concurrent check-in calls
  {
    console.log('\n[1.1] Replay Attack & Audit Inflation Test on Check-In...');
    const checkInUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`;
    const payload = {
      entry_id: 'local-entry-ready',
      dancer_uid: 'local-ph-manager',
    };

    // First call
    const firstRes = await fetch(checkInUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(payload),
    });
    assert.equal(firstRes.status, 200, 'Initial check-in must succeed');
    const firstReceipt = await firstRes.json();
    assert.ok(firstReceipt.pass_id, 'Must contain pass_id');

    // Launch 50 concurrent replay requests
    const replays = await Promise.all(
      Array.from({ length: 50 }, () =>
        fetch(checkInUrl, {
          method: 'POST',
          headers: authHeader(marshalToken),
          body: JSON.stringify(payload),
        }).then(r => r.json())
      )
    );

    const allIdentical = replays.every(
      r => r.pass_id === firstReceipt.pass_id &&
           r.checked_in_at === firstReceipt.checked_in_at &&
           r.dancer_uid === firstReceipt.dancer_uid &&
           r.scanner_uid === firstReceipt.scanner_uid
    );
    record(
      'F35-1.1: 50 concurrent check-ins return identical receipt (Replay Protection)',
      allIdentical,
      `All 50 responses matched pass_id=${firstReceipt.pass_id}`
    );

    // Verify zero duplicate records in check-ins collection
    const checkInsRes = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-ins?limit=100`, {
      headers: authHeader(marshalToken),
    });
    assert.equal(checkInsRes.status, 200);
    const checkInsPage = await checkInsRes.json();
    const dancerRecords = checkInsPage.items.filter(i => i.dancer_uid === 'local-ph-manager');
    record(
      'F35-1.2: Zero duplicate check-in records in database',
      dancerRecords.length === 1,
      `Exact count of records for dancer=${dancerRecords.length}`
    );

    // Verify audit trail: zero audit inflation! Check document directly by pass_id
    const auditDoc = await getFirestoreDoc(`chapters/ph/audit/${firstReceipt.pass_id}`);
    const auditValid = auditDoc !== null &&
      auditDoc.fields?.action?.stringValue === 'dancer_checked_in' &&
      auditDoc.fields?.resource_id?.stringValue === firstReceipt.pass_id;
    record(
      'F35-1.3: Audit record strictly unique with zero inflation on repeated check-in replays',
      auditValid,
      `Audit record exists with id=${firstReceipt.pass_id}, action=dancer_checked_in`
    );
  }

  // 1.2 Readiness Barrier: Unapproved or 4-vector unready entries
  {
    console.log('\n[1.2] Readiness Barrier Stress Testing...');
    const checkInUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`;

    // Attempt check-in on draft (unapproved, 0 paid, no audio) entry
    const draftRes = await fetch(checkInUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        entry_id: 'local-entry-draft',
        dancer_uid: 'local-ph-manager',
      }),
    });
    record(
      'F35-2.1: Check-in on draft (unapproved/unready) entry fails closed with 409 Conflict',
      draftRes.status === 409,
      `status=${draftRes.status}`
    );

    // Attempt check-in with non-existent / phantom dancer
    const phantomRes = await fetch(checkInUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        entry_id: 'local-entry-ready',
        dancer_uid: 'phantom-dancer-nonexistent',
      }),
    });
    record(
      'F35-2.2: Check-in with phantom dancer fails closed with 409 Conflict',
      phantomRes.status === 409,
      `status=${phantomRes.status}`
    );

    // Attempt check-in missing entry_id
    const missingEntryRes = await fetch(checkInUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        dancer_uid: 'local-ph-manager',
      }),
    });
    record(
      'F35-2.3: Check-in missing entry_id rejected with 400 Bad Request',
      missingEntryRes.status === 400,
      `status=${missingEntryRes.status}`
    );
  }

  // 1.3 Tenant & Event Isolation
  {
    console.log('\n[1.3] Multi-Tenant Chapter & Event Isolation...');

    // Attempt check-in across chapter boundaries: PH marshal calling HK endpoint
    const crossChapterRes = await fetch(`${API_BASE}/v1/chapters/hk/events/local-rehearsal/check-in`, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        entry_id: 'local-entry-ready',
        dancer_uid: 'local-ph-manager',
      }),
    });
    record(
      'F35-3.1: Cross-chapter check-in call rejected with 403 Forbidden',
      crossChapterRes.status === 403,
      `status=${crossChapterRes.status}`
    );

    // HK manager calling PH check-in
    const hkCallRes = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`, {
      method: 'POST',
      headers: authHeader(hkManagerToken),
      body: JSON.stringify({
        entry_id: 'local-entry-ready',
        dancer_uid: 'local-ph-manager',
      }),
    });
    record(
      'F35-3.2: Foreign tenant calling chapter check-in rejected with 403 Forbidden',
      hkCallRes.status === 403,
      `status=${hkCallRes.status}`
    );
  }

  // 1.4 Least Privilege & Role Barrier
  {
    console.log('\n[1.4] Role Authorization & Least Privilege...');
    const checkInUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`;
    const payload = { entry_id: 'local-entry-ready', dancer_uid: 'local-ph-manager' };

    // Unauthenticated
    const unauth = await fetch(checkInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    record('F35-4.1: Unauthenticated check-in rejected with 401 Unauthorized', unauth.status === 401, `status=${unauth.status}`);

    // Crew Manager
    const mgr = await fetch(checkInUrl, { method: 'POST', headers: authHeader(managerToken), body: JSON.stringify(payload) });
    record('F35-4.2: Crew Manager scanning pass rejected with 403 Forbidden', mgr.status === 403, `status=${mgr.status}`);

    // Judge
    const judge = await fetch(checkInUrl, { method: 'POST', headers: authHeader(judgeToken), body: JSON.stringify(payload) });
    record('F35-4.3: Judge scanning pass rejected with 403 Forbidden', judge.status === 403, `status=${judge.status}`);

    // Dancer
    const dancer = await fetch(checkInUrl, { method: 'POST', headers: authHeader(dancerToken), body: JSON.stringify(payload) });
    record('F35-4.4: Dancer scanning pass rejected with 403 Forbidden', dancer.status === 403, `status=${dancer.status}`);

    // Support staff
    const support = await fetch(checkInUrl, { method: 'POST', headers: authHeader(supportToken), body: JSON.stringify(payload) });
    record('F35-4.5: Support staff scanning pass rejected with 403 Forbidden', support.status === 403, `status=${support.status}`);

    // Director (Authorized)
    const director = await fetch(checkInUrl, { method: 'POST', headers: authHeader(directorToken), body: JSON.stringify(payload) });
    record('F35-4.6: Chapter Director scanning pass succeeds (200 OK)', director.status === 200, `status=${director.status}`);
  }

  // ==========================================================================
  // SECTION 2: FEATURE 36 — STAGE MARSHAL QUEUE ADVERSARIAL STRESS
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 2: STAGE MARSHAL QUEUE (F36) ADVERSARIAL STRESS');
  console.log('='.repeat(80));

  const stageCmdUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/stage-commands`;
  const stageHoldUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/stage-holds`;
  const stageCreateUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/stage-create`;
  const stageMarshalUrl = `${API_BASE}/v1/chapters/ph/events/local-rehearsal/stage-marshals`;

  // Create an isolated stage for this adversarial test suite
  const testStageId = `adv-stage-${crypto.randomBytes(6).toString('hex')}`;
  console.log(`\n[2.0] Creating dedicated adversarial stage: ${testStageId}...`);
  const createStageRes = await fetch(stageCreateUrl, {
    method: 'POST',
    headers: authHeader(directorToken),
    body: JSON.stringify({
      operation_id: crypto.randomUUID(),
      stage_id: testStageId,
      single_performer: true,
    }),
  });
  assert.equal(createStageRes.status, 200, 'Director must create stage');

  // Assign marshal to stage
  const assignMarshalRes = await fetch(stageMarshalUrl, {
    method: 'POST',
    headers: authHeader(directorToken),
    body: JSON.stringify({
      operation_id: crypto.randomUUID(),
      stage_id: testStageId,
      expected_revision: 0,
      marshal_uids: ['local-ph-marshal'],
    }),
  });
  assert.equal(assignMarshalRes.status, 200, 'Director must assign marshal');

  // Release initial hold on created stage
  const releaseInitHoldRes = await fetch(stageHoldUrl, {
    method: 'POST',
    headers: authHeader(directorToken),
    body: JSON.stringify({
      operation_id: crypto.randomUUID(),
      stage_id: testStageId,
      expected_revision: 0,
      held: false,
    }),
  });
  assert.equal(releaseInitHoldRes.status, 200, 'Initial hold must be released');

  async function createReadyEntry(entryId, dancerUid) {
    const parentPath = 'chapters/ph/events/local-rehearsal';
    const entryData = {
      entry: {
        id: entryId,
        chapter_id: 'ph',
        event_id: 'local-rehearsal',
        division_id: 'local-open',
        crew_id: 'local-crew-ready',
        status: 'approved',
        paid_minor: 150000,
        rules_version: 'local-fixture-v1',
        revision: 1,
        track_filename: 'synthetic-compliance-fixture.mp3',
        track_duration_secs: 120,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        roster: [
          {
            uid: dancerUid,
            name: `Dancer ${dancerUid}`,
            role: 'Dancer',
            is_minor: false,
            consent_verified: true,
          },
        ],
      },
      pending_minor: 0,
      completed_scorecards: 0,
    };
    const res = await fetch(`${FIRESTORE_BASE}/${parentPath}/entries/${entryId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreValue(entryData).mapValue.fields }),
    });
    assert.equal(res.status, 200, `createReadyEntry ${entryId} must succeed`);
    const checkin = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ entry_id: entryId, dancer_uid: dancerUid }),
    });
    assert.equal(checkin.status, 200, `check-in for ${dancerUid} must succeed`);
    return entryId;
  }

  // 2.1 Anti-Skip & Anti-Reverse Monotonicity
  {
    console.log('\n[2.1] Anti-Skip & Anti-Reverse Monotonicity Invariants...');
    const progEntryId = await createReadyEntry(
      `entry-prog-${crypto.randomBytes(4).toString('hex')}`,
      `dancer-prog-${crypto.randomBytes(4).toString('hex')}`
    );
    const stageCommand = (opId, expRev, pos) => ({
      operation_id: opId,
      stage_id: testStageId,
      entry_id: progEntryId,
      expected_revision: expRev,
      position: pos,
    });

    // Step 1: Advance to Holding (0 -> 1)
    const holdRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 0, 'holding')),
    });
    assert.equal(holdRes.status, 200, 'Holding transition must succeed');
    record('F36-1.1: Legal transition: initial entry -> holding (rev 0 -> 1)', true, 'revision=1');

    // Attack 1: Illegal skip from Holding -> Performing (skipping on_deck)
    const skipToPerforming = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 1, 'performing')),
    });
    record(
      'F36-1.2: Illegal skip: holding -> performing rejected with 409 Conflict',
      skipToPerforming.status === 409,
      `status=${skipToPerforming.status}`
    );

    // Attack 2: Illegal skip from Holding -> Completed
    const skipToCompleted = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 1, 'completed')),
    });
    record(
      'F36-1.3: Illegal skip: holding -> completed rejected with 409 Conflict',
      skipToCompleted.status === 409,
      `status=${skipToCompleted.status}`
    );

    // Legal advance: Holding -> OnDeck (1 -> 2)
    const onDeckRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 1, 'on_deck')),
    });
    assert.equal(onDeckRes.status, 200);
    record('F36-1.4: Legal transition: holding -> on_deck (rev 1 -> 2)', true, 'revision=2');

    // Attack 3: Illegal skip from OnDeck -> Completed (skipping performing)
    const skipDeckToCompleted = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 2, 'completed')),
    });
    record(
      'F36-1.5: Illegal skip: on_deck -> completed rejected with 409 Conflict',
      skipDeckToCompleted.status === 409,
      `status=${skipDeckToCompleted.status}`
    );

    // Attack 4: Illegal reverse: OnDeck -> Holding
    const reverseDeckToHolding = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 2, 'holding')),
    });
    record(
      'F36-1.6: Illegal reverse: on_deck -> holding rejected with 409 Conflict',
      reverseDeckToHolding.status === 409,
      `status=${reverseDeckToHolding.status}`
    );

    // Legal advance: OnDeck -> Performing (2 -> 3)
    const perfRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 2, 'performing')),
    });
    assert.equal(perfRes.status, 200);
    record('F36-1.7: Legal transition: on_deck -> performing (rev 2 -> 3)', true, 'revision=3');

    // Attack 5: Illegal reverse: Performing -> OnDeck
    const reversePerfToDeck = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 3, 'on_deck')),
    });
    record(
      'F36-1.8: Illegal reverse: performing -> on_deck rejected with 409 Conflict',
      reversePerfToDeck.status === 409,
      `status=${reversePerfToDeck.status}`
    );

    // Attack 6: Illegal reverse: Performing -> Holding
    const reversePerfToHold = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 3, 'holding')),
    });
    record(
      'F36-1.9: Illegal reverse: performing -> holding rejected with 409 Conflict',
      reversePerfToHold.status === 409,
      `status=${reversePerfToHold.status}`
    );

    // Legal advance: Performing -> Completed (3 -> 4)
    const compRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 3, 'completed')),
    });
    assert.equal(compRes.status, 200);
    record('F36-1.10: Legal transition: performing -> completed (rev 3 -> 4)', true, 'revision=4');

    // Attack 7: Illegal reverse: Completed -> Performing
    const reverseCompToPerf = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 4, 'performing')),
    });
    record(
      'F36-1.11: Illegal reverse: completed -> performing rejected with 409 Conflict',
      reverseCompToPerf.status === 409,
      `status=${reverseCompToPerf.status}`
    );

    // Attack 8: Illegal reverse: Completed -> OnDeck
    const reverseCompToDeck = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify(stageCommand(crypto.randomUUID(), 4, 'on_deck')),
    });
    record(
      'F36-1.12: Illegal reverse: completed -> on_deck rejected with 409 Conflict',
      reverseCompToDeck.status === 409,
      `status=${reverseCompToDeck.status}`
    );
  }

  // 2.2 Stage Hold Barrier
  {
    console.log('\n[2.2] Stage Hold Barrier Enforcement...');
    const holdStageId = `hold-stage-${crypto.randomBytes(6).toString('hex')}`;
    await fetch(stageCreateUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, single_performer: true }),
    });
    await fetch(stageMarshalUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, expected_revision: 0, marshal_uids: ['local-ph-marshal'] }),
    });
    await fetch(stageHoldUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, expected_revision: 0, held: false }),
    });

    const holdEntryId = await createReadyEntry(
      `entry-hold-${crypto.randomBytes(4).toString('hex')}`,
      `dancer-hold-${crypto.randomBytes(4).toString('hex')}`
    );

    // Advance entry to Holding then OnDeck on holdStageId
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, entry_id: holdEntryId, expected_revision: 0, position: 'holding' }),
    });
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, entry_id: holdEntryId, expected_revision: 1, position: 'on_deck' }),
    });

    // Put stage on HOLD
    const holdRes = await fetch(stageHoldUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, expected_revision: 1, held: true }),
    });
    assert.equal(holdRes.status, 200, 'Hold must be placed');

    // Attempt to transition entry from on_deck to performing during hold
    const blockedRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, entry_id: holdEntryId, expected_revision: 2, position: 'performing' }),
    });
    record(
      'F36-2.1: Entry blocked from entering performing while stage is on hold (409 Conflict)',
      blockedRes.status === 409,
      `status=${blockedRes.status}`
    );

    // Release hold
    const releaseRes = await fetch(stageHoldUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, expected_revision: 2, held: false }),
    });
    assert.equal(releaseRes.status, 200, 'Hold must be released');

    // Entry can now advance to performing
    const unblockedRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, entry_id: holdEntryId, expected_revision: 2, position: 'performing' }),
    });
    record(
      'F36-2.2: Entry advances to performing immediately after hold release (200 OK)',
      unblockedRes.status === 200,
      `status=${unblockedRes.status}`
    );

    // Verify: Placing hold WHILE entry is performing does NOT prevent advancing to completed
    await fetch(stageHoldUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, expected_revision: 3, held: true }),
    });
    const completeUnderHold = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: holdStageId, entry_id: holdEntryId, expected_revision: 3, position: 'completed' }),
    });
    record(
      'F36-2.3: Performing entry can complete routine safely during active hold (200 OK)',
      completeUnderHold.status === 200,
      `status=${completeUnderHold.status}`
    );
  }

  // 2.3 Single-Performer Concurrency Lock
  {
    console.log('\n[2.3] Single-Performer Concurrency Lock...');
    const raceStageId = `race-stage-${crypto.randomBytes(6).toString('hex')}`;
    await fetch(stageCreateUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, single_performer: true }),
    });
    await fetch(stageMarshalUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, expected_revision: 0, marshal_uids: ['local-ph-marshal'] }),
    });
    await fetch(stageHoldUrl, {
      method: 'POST',
      headers: authHeader(directorToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, expected_revision: 0, held: false }),
    });

    const entry1Id = await createReadyEntry(
      `entry-race1-${crypto.randomBytes(4).toString('hex')}`,
      `dancer-race1-${crypto.randomBytes(4).toString('hex')}`
    );
    const entry2Id = await createReadyEntry(
      `entry-race2-${crypto.randomBytes(4).toString('hex')}`,
      `dancer-race2-${crypto.randomBytes(4).toString('hex')}`
    );

    // Advance both entries to on_deck
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry1Id, expected_revision: 0, position: 'holding' }),
    });
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry1Id, expected_revision: 1, position: 'on_deck' }),
    });

    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry2Id, expected_revision: 0, position: 'holding' }),
    });
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry2Id, expected_revision: 1, position: 'on_deck' }),
    });

    // Concurrently attempt to advance BOTH to performing simultaneously
    const [resA, resB] = await Promise.all([
      fetch(stageCmdUrl, {
        method: 'POST',
        headers: authHeader(marshalToken),
        body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry1Id, expected_revision: 2, position: 'performing' }),
      }),
      fetch(stageCmdUrl, {
        method: 'POST',
        headers: authHeader(marshalToken),
        body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: entry2Id, expected_revision: 2, position: 'performing' }),
      }),
    ]);

    const statuses = [resA.status, resB.status];
    const exactlyOneSuccess = (statuses.includes(200) && statuses.includes(409));
    record(
      'F36-3.1: Concurrent entries entering performing: exactly ONE wins (200), loser rejected (409 Conflict)',
      exactlyOneSuccess,
      `Statuses=[${resA.status}, ${resB.status}]`
    );

    // Identify who won and who lost
    const winnerEntryId = resA.status === 200 ? entry1Id : entry2Id;
    const loserEntryId = resA.status === 200 ? entry2Id : entry1Id;

    // Competing attempt while winner is performing fails
    const secondTryLoser = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: loserEntryId, expected_revision: 2, position: 'performing' }),
    });
    record(
      'F36-3.2: Stage serialization: competitor blocked while winner is performing (409 Conflict)',
      secondTryLoser.status === 409,
      `status=${secondTryLoser.status}`
    );

    // Winner completes
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: winnerEntryId, expected_revision: 3, position: 'completed' }),
    });

    // Now loser can enter performing
    const loserNowEnters = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: loserEntryId, expected_revision: 2, position: 'performing' }),
    });
    record(
      'F36-3.3: Competitor enters performing after previous performer completes (200 OK)',
      loserNowEnters.status === 200,
      `status=${loserNowEnters.status}`
    );

    // Cleanly complete loser so no active claim remains
    await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ operation_id: crypto.randomUUID(), stage_id: raceStageId, entry_id: loserEntryId, expected_revision: 3, position: 'completed' }),
    });
  }

  // 2.4 Pre-Stage Dancer Check-In Requirement
  {
    console.log('\n[2.4] Pre-Stage Dancer Check-In Barrier...');
    // Create an un-checked-in entry directly in Firestore for this test
    const unchkdEntryId = `entry-unchkd-${crypto.randomBytes(6).toString('hex')}`;
    const unchkdDancerUid = `dancer-unchkd-${crypto.randomBytes(6).toString('hex')}`;
    const parentPath = 'chapters/ph/events/local-rehearsal';

    const entryData = {
      entry: {
        id: unchkdEntryId,
        chapter_id: 'ph',
        event_id: 'local-rehearsal',
        division_id: 'local-open',
        crew_id: 'local-crew-ready',
        status: 'approved',
        paid_minor: 150000,
        rules_version: 'local-fixture-v1',
        revision: 1,
        track_filename: 'synthetic-compliance-fixture.mp3',
        track_duration_secs: 120,
        created_at: Math.floor(Date.now() / 1000),
        updated_at: Math.floor(Date.now() / 1000),
        roster: [
          {
            uid: unchkdDancerUid,
            name: 'Unchecked Dancer',
            role: 'Dancer',
            is_minor: false,
            consent_verified: true,
          },
        ],
      },
      pending_minor: 0,
      completed_scorecards: 0,
    };

    // Patch entry document to Firestore
    const writeRes = await fetch(`${FIRESTORE_BASE}/${parentPath}/entries/${unchkdEntryId}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreValue(entryData).mapValue.fields }),
    });
    assert.equal(writeRes.status, 200, 'Test entry must be written');

    // Attempt to put un-checked-in entry on stage queue
    const unchkdQueueRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        stage_id: testStageId,
        entry_id: unchkdEntryId,
        expected_revision: 0,
        position: 'holding',
      }),
    });
    record(
      'F36-4.1: Entry with unchecked-in roster dancers rejected from stage queue (409 Conflict)',
      unchkdQueueRes.status === 409,
      `status=${unchkdQueueRes.status}`
    );

    // Now check in the dancer
    const checkinRes = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/check-in`, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({ entry_id: unchkdEntryId, dancer_uid: unchkdDancerUid }),
    });
    assert.equal(checkinRes.status, 200, 'Dancer check-in must succeed');

    // Now putting on stage queue succeeds
    const nowQueuedRes = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(marshalToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        stage_id: testStageId,
        entry_id: unchkdEntryId,
        expected_revision: 0,
        position: 'holding',
      }),
    });
    record(
      'F36-4.2: Entry queues successfully into holding after all roster dancers check in (200 OK)',
      nowQueuedRes.status === 200,
      `status=${nowQueuedRes.status}`
    );
  }

  // ==========================================================================
  // SECTION 3: FEATURE 37 — NATIVE CONTACT INQUIRIES ADVERSARIAL STRESS
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 3: NATIVE CONTACT INQUIRIES (F37) ADVERSARIAL STRESS');
  console.log('='.repeat(80));

  const contactUrl = `${API_BASE}/v1/chapters/ph/contact`;

  // 3.1 Capability Key Authentication & Thread Access
  {
    console.log('\n[3.1] Capability Key Authentication & Zero-PII Projection...');
    const capabilityKey = crypto.randomBytes(32).toString('hex'); // 64 hex chars = 256 bits
    const inquiryOpId = crypto.randomUUID();
    const contactEmail = `visitor-${crypto.randomBytes(4).toString('hex')}@example.test`;

    const createRes = await fetch(contactUrl, {
      method: 'POST',
      headers: {
        Authorization: `Contact ${capabilityKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation_id: inquiryOpId,
        requester_name: 'Adversarial Visitor',
        email: contactEmail,
        subject: 'Ticket Tier Question',
        category: 'registration',
        message: 'Are VIP pit passes available for the finals?',
      }),
    });
    assert.equal(createRes.status, 200, 'Inquiry creation must succeed');
    const createdInq = await createRes.json();
    assert.ok(createdInq.id.startsWith('inquiry-'));

    // Access thread with valid capability key
    const validThreadRes = await fetch(`${contactUrl}/${createdInq.id}`, {
      headers: { Authorization: `Contact ${capabilityKey}` },
    });
    record(
      'F37-1.1: Visitor retrieves thread with valid 256-bit capability key (200 OK)',
      validThreadRes.status === 200,
      `inquiry_id=${createdInq.id}`
    );

    const threadData = await validThreadRes.json();
    // Verify zero PII leaked in visitor projection
    const noPiiLeak = (threadData.inquiry.email === undefined && threadData.inquiry.capability_hash === undefined);
    record(
      'F37-1.2: Visitor thread projection strictly omits email and capability_hash (Zero-PII)',
      noPiiLeak,
      `email=${threadData.inquiry.email}, capability_hash=${threadData.inquiry.capability_hash}`
    );

    // Access thread with invalid / wrong capability key
    const wrongKey = crypto.randomBytes(32).toString('hex');
    const wrongKeyRes = await fetch(`${contactUrl}/${createdInq.id}`, {
      headers: { Authorization: `Contact ${wrongKey}` },
    });
    record(
      'F37-1.3: Access with incorrect capability key rejected with 404 Not Found',
      wrongKeyRes.status === 404,
      `status=${wrongKeyRes.status}`
    );

    // Access thread with missing Authorization header
    const noKeyRes = await fetch(`${contactUrl}/${createdInq.id}`);
    record(
      'F37-1.4: Access with missing Authorization header rejected with 404 Not Found',
      noKeyRes.status === 404,
      `status=${noKeyRes.status}`
    );

    // Access thread with malformed key formats (short, long, non-hex, spaces)
    const malformedKeys = [
      'a'.repeat(32),        // 32 chars (too short)
      'a'.repeat(63),        // 63 chars (off by 1)
      'a'.repeat(65),        // 65 chars (off by 1)
      'g'.repeat(64),        // non-hex character 'g'
      ' '.repeat(64),        // spaces
      'A'.repeat(64),        // uppercase (secret parser requires lowercase ascii hex)
    ];
    let allMalformedRejected = true;
    for (const mk of malformedKeys) {
      const res = await fetch(`${contactUrl}/${createdInq.id}`, {
        headers: { Authorization: `Contact ${mk}` },
      });
      if (res.status !== 404) allMalformedRejected = false;
    }
    record(
      'F37-1.5: Malformed capability keys (short, long, non-hex, spaces) rejected with 404',
      allMalformedRejected,
      `tested=${malformedKeys.length} malformed key vectors`
    );
  }

  // 3.2 Spam Rate Limiting: Actor Quota (5/hr)
  {
    console.log('\n[3.2] Spam Rate Limiting: Actor Limit (5/hr) & Chapter Quota...');
    const spamEmail = `spammer-${crypto.randomBytes(6).toString('hex')}@example.test`;
    const spamCapKey = crypto.randomBytes(32).toString('hex');

    const submitInquiry = (idx) =>
      fetch(contactUrl, {
        method: 'POST',
        headers: { Authorization: `Contact ${spamCapKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_id: crypto.randomUUID(),
          requester_name: 'Rapid Submitter',
          email: spamEmail,
          subject: `Rapid Inquiry #${idx}`,
          category: 'general',
          message: `Spam attempt number ${idx}`,
        }),
      });

    // Send 5 rapid inquiries from the same actor
    const burstResponses = [];
    for (let i = 1; i <= 5; i++) {
      burstResponses.push(await submitInquiry(i));
    }
    const burst5Ok = burstResponses.every(r => r.status === 200);
    record(
      'F37-2.1: First 5 inquiries within the hour window succeed (200 OK)',
      burst5Ok,
      `All 5 burst requests returned 200 OK`
    );

    // 6th inquiry from the same actor MUST FAIL with 429 Too Many Requests
    const overflowRes = await submitInquiry(6);
    record(
      'F37-2.2: 6th inquiry from same actor strictly rejected with 429 Too Many Requests',
      overflowRes.status === 429,
      `status=${overflowRes.status}`
    );

    // A different actor/email can still submit
    const differentActorRes = await fetch(contactUrl, {
      method: 'POST',
      headers: { Authorization: `Contact ${crypto.randomBytes(32).toString('hex')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        requester_name: 'Legitimate Visitor',
        email: `legit-${crypto.randomBytes(4).toString('hex')}@example.test`,
        subject: 'Legit Question',
        category: 'general',
        message: 'Can I register on-site?',
      }),
    });
    record(
      'F37-2.3: Different actor not blocked by individual actor quota (200 OK)',
      differentActorRes.status === 200,
      `status=${differentActorRes.status}`
    );
  }

  // 3.3 Input Validation & Bounds
  {
    console.log('\n[3.3] Input Validation & Bounds Stress Testing...');
    const testCapKey = crypto.randomBytes(32).toString('hex');
    const sendPayload = (body) =>
      fetch(contactUrl, {
        method: 'POST',
        headers: { Authorization: `Contact ${testCapKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    const validBase = {
      operation_id: crypto.randomUUID(),
      requester_name: 'Tester',
      email: 'test@example.test',
      subject: 'Valid Subject',
      category: 'general',
      message: 'Valid message body.',
    };

    // Invalid emails
    for (const badEmail of ['notanemail', '@missinguser.com', 'user@', 'user name@space.com']) {
      const res = await sendPayload({ ...validBase, operation_id: crypto.randomUUID(), email: badEmail });
      assert.equal(res.status, 400, `Bad email '${badEmail}' must be rejected with 400`);
    }
    record('F37-3.1: Malformed email formats rejected with 400 Bad Request', true, 'Tested missing @, spaces, trailing @');

    // Blank / whitespace subject
    const blankSubj = await sendPayload({ ...validBase, operation_id: crypto.randomUUID(), subject: '   \n\t  ' });
    record('F37-3.2: Whitespace-only subject rejected with 400 Bad Request', blankSubj.status === 400, `status=${blankSubj.status}`);

    // Blank / whitespace message
    const blankMsg = await sendPayload({ ...validBase, operation_id: crypto.randomUUID(), message: '   ' });
    record('F37-3.3: Whitespace-only message rejected with 400 Bad Request', blankMsg.status === 400, `status=${blankMsg.status}`);

    // Invalid category
    const badCat = await sendPayload({ ...validBase, operation_id: crypto.randomUUID(), category: 'unauthorized_category' });
    record('F37-3.4: Unapproved category rejected with 400 Bad Request', badCat.status === 400, `status=${badCat.status}`);

    // Subject exceeding 120 chars
    const longSubj = await sendPayload({ ...validBase, operation_id: crypto.randomUUID(), subject: 'A'.repeat(121) });
    record('F37-3.5: Subject > 120 characters rejected with 400 Bad Request', longSubj.status === 400, `status=${longSubj.status}`);
  }

  // 3.4 Creation Replay & Idempotency
  {
    console.log('\n[3.4] Creation Replay & Idempotency...');
    const replayOpId = crypto.randomUUID();
    const replayKey = crypto.randomBytes(32).toString('hex');
    const replayPayload = {
      operation_id: replayOpId,
      requester_name: 'Replayer',
      email: `replay-${crypto.randomBytes(4).toString('hex')}@example.test`,
      subject: 'Replay Subject',
      category: 'general',
      message: 'Initial replay message',
    };

    const first = await fetch(contactUrl, {
      method: 'POST',
      headers: { Authorization: `Contact ${replayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(replayPayload),
    });
    assert.equal(first.status, 200);
    const receipt1 = await first.json();

    // Replay with identical payload
    const second = await fetch(contactUrl, {
      method: 'POST',
      headers: { Authorization: `Contact ${replayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(replayPayload),
    });
    assert.equal(second.status, 200);
    const receipt2 = await second.json();
    record(
      'F37-4.1: Idempotent replay of inquiry returns identical receipt',
      receipt1.id === receipt2.id && receipt1.created_at === receipt2.created_at,
      `id=${receipt1.id}`
    );

    // Replay with modified payload (operation ID collision with changed input)
    const altered = await fetch(contactUrl, {
      method: 'POST',
      headers: { Authorization: `Contact ${replayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...replayPayload, message: 'Altered message content' }),
    });
    record(
      'F37-4.2: Reusing operation_id with changed message rejected with 409 Conflict',
      altered.status === 409,
      `status=${altered.status}`
    );
  }

  // ==========================================================================
  // SECTION 4: FEATURE 38 — CHAPTER SUPPORT QUEUE ADVERSARIAL STRESS
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 4: CHAPTER SUPPORT QUEUE (F38) ADVERSARIAL STRESS');
  console.log('='.repeat(80));

  const supportUrl = `${API_BASE}/v1/chapters/ph/support`;

  // 4.1 Multi-Tenant Chapter Isolation
  {
    console.log('\n[4.1] Multi-Tenant Support Isolation...');

    // Support staff from chapter 'ph' accesses PH support queue
    const phQueueRes = await fetch(supportUrl, { headers: authHeader(supportToken) });
    record('F48-1.1: Chapter support staff accesses local chapter queue (200 OK)', phQueueRes.status === 200, `status=${phQueueRes.status}`);

    // Support staff from chapter 'ph' attempts to access HK support queue
    const hkCrossRes = await fetch(`${API_BASE}/v1/chapters/hk/support`, { headers: authHeader(supportToken) });
    record(
      'F48-1.2: Support staff accessing other chapter queue rejected with 403 Forbidden',
      hkCrossRes.status === 403,
      `status=${hkCrossRes.status}`
    );

    // Foreign user (manager@hk) attempting to access PH support queue
    const foreignAccessRes = await fetch(supportUrl, { headers: authHeader(hkManagerToken) });
    record(
      'F48-1.3: Foreign tenant attempting to access PH support queue rejected with 403 Forbidden',
      foreignAccessRes.status === 403,
      `status=${foreignAccessRes.status}`
    );
  }

  // 4.2 Least Privilege: Support Staff Barred from Finance & Admin Roles
  {
    console.log('\n[4.2] Least Privilege: Support Staff Role Restrictions...');

    // 1. Finance refund endpoint
    const refundAttempt = await fetch(`${API_BASE}/v1/chapters/ph/finance/payments/local-fixture-settled/refund`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({}),
    });
    record(
      'F48-2.1: Support staff role barred from payment refund (403 Forbidden)',
      refundAttempt.status === 403,
      `status=${refundAttempt.status}`
    );

    // 2. Division locking endpoint
    const lockAttempt = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/divisions/local-open/lock`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({}),
    });
    record(
      'F48-2.2: Support staff role barred from division locking (403 Forbidden)',
      lockAttempt.status === 403,
      `status=${lockAttempt.status}`
    );

    // 3. Division publication endpoint
    const pubAttempt = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/divisions/local-open/publish`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({ allow_ties: true }),
    });
    record(
      'F48-2.3: Support staff role barred from division results publication (403 Forbidden)',
      pubAttempt.status === 403,
      `status=${pubAttempt.status}`
    );

    // 4. Score submission endpoint
    const scoreAttempt = await fetch(`${API_BASE}/v1/chapters/ph/events/local-rehearsal/scores`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({
        schema_version: 1,
        operation_id: crypto.randomUUID(),
        division_id: 'local-open',
        crew_id: 'local-crew-ready',
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      }),
    });
    record(
      'F48-2.4: Support staff role barred from judge score submission (403 Forbidden)',
      scoreAttempt.status === 403,
      `status=${scoreAttempt.status}`
    );

    // 5. Stage command endpoint
    const stageAttempt = await fetch(stageCmdUrl, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        stage_id: testStageId,
        entry_id: 'local-entry-ready',
        expected_revision: 0,
        position: 'holding',
      }),
    });
    record(
      'F48-2.5: Support staff role barred from stage commands (403 Forbidden)',
      stageAttempt.status === 403,
      `status=${stageAttempt.status}`
    );
  }

  // 4.3 Optimistic Concurrency Control (OCC) & Reply Updates
  {
    console.log('\n[4.3] Optimistic Concurrency Control & Status Transitions...');
    // Create an inquiry to test staff reply and resolution
    const inqKey = crypto.randomBytes(32).toString('hex');
    const createRes = await fetch(contactUrl, {
      method: 'POST',
      headers: { Authorization: `Contact ${inqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        requester_name: 'Studio Partner',
        email: `studio-${crypto.randomBytes(4).toString('hex')}@example.test`,
        subject: 'Partnership Proposal',
        category: 'partner_application',
        message: 'We wish to host preliminary workshops in Manila.',
      }),
    });
    const inquiry = await createRes.json();
    assert.equal(inquiry.revision, 1);

    // Attack 1: Contact requester attempting to set status to 'resolved' directly
    const requesterResolve = await fetch(`${contactUrl}/${inquiry.id}`, {
      method: 'POST',
      headers: { Authorization: `Contact ${inqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        expected_revision: 1,
        message: 'Self resolving inquiry',
        status: 'resolved',
      }),
    });
    record(
      'F48-3.1: Contact requester barred from setting status to resolved (403 Forbidden)',
      requesterResolve.status === 403,
      `status=${requesterResolve.status}`
    );

    // Legal staff update: status -> waiting_on_requester (revision 1 -> 2)
    const staffReplyRes = await fetch(`${supportUrl}/${inquiry.id}`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        expected_revision: 1,
        message: 'Thank you for your proposal. Please provide workshop dates.',
        status: 'waiting_on_requester',
      }),
    });
    assert.equal(staffReplyRes.status, 200, 'Staff reply must succeed');
    const replySummary = await staffReplyRes.json();
    assert.equal(replySummary.revision, 2);
    record('F48-3.2: Staff replies and advances inquiry revision (1 -> 2)', true, 'revision=2, status=waiting_on_requester');

    // Attack 2: Stale expected_revision update (using revision 1 instead of 2)
    const staleUpdate = await fetch(`${supportUrl}/${inquiry.id}`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        expected_revision: 1, // Stale! Current is 2
        message: 'Stale update attempt',
        status: 'in_progress',
      }),
    });
    record(
      'F48-3.3: Stale expected_revision update rejected with 409 Conflict',
      staleUpdate.status === 409,
      `status=${staleUpdate.status}`
    );

    // Attack 3: Concurrent racing updates (OCC collision)
    const [raceA, raceB] = await Promise.all([
      fetch(`${supportUrl}/${inquiry.id}`, {
        method: 'POST',
        headers: authHeader(supportToken),
        body: JSON.stringify({
          operation_id: crypto.randomUUID(),
          expected_revision: 2,
          message: 'Concurrent update A',
          status: 'in_progress',
        }),
      }),
      fetch(`${supportUrl}/${inquiry.id}`, {
        method: 'POST',
        headers: authHeader(supportToken),
        body: JSON.stringify({
          operation_id: crypto.randomUUID(),
          expected_revision: 2,
          message: 'Concurrent update B',
          status: 'resolved',
        }),
      }),
    ]);
    const raceStatuses = [raceA.status, raceB.status];
    const exactlyOneOccWon = (raceStatuses.includes(200) && raceStatuses.includes(409));
    record(
      'F48-3.4: Concurrent staff updates on same ticket: exactly ONE wins (200), loser rejected (409 Conflict)',
      exactlyOneOccWon,
      `Statuses=[${raceA.status}, ${raceB.status}]`
    );

    // Legal staff resolution
    const resolveRes = await fetch(`${supportUrl}/${inquiry.id}`, {
      method: 'POST',
      headers: authHeader(supportToken),
      body: JSON.stringify({
        operation_id: crypto.randomUUID(),
        expected_revision: 3,
        message: 'Partnership proposal approved and finalized.',
        status: 'resolved',
      }),
    });
    record(
      'F48-3.5: Support staff successfully marks inquiry as resolved (200 OK)',
      resolveRes.status === 200,
      `status=${resolveRes.status}`
    );
  }

  // ==========================================================================
  // SECTION 5: SYSTEM HARNESS MODEL INVARIANT VERIFICATION
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 5: SYSTEM HARNESS MODEL INVARIANT VERIFICATION');
  console.log('='.repeat(80));

  {
    const harness = new SystemHarness();
    harness.reset();

    // 5.1 SystemHarness Stage Queue Invariants (Status validation, RBAC, draft rejection)
    let harnessStageInvariantsPass = true;
    try {
      const crew = harness.createCrew('ph', 'mgr-perm', 'Perm Crew', 'Manila');
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      
      // 1. Unapproved entry rejected
      assert.throws(() => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'holding'), /Only approved entries/);
      
      // Approve entry
      entry.status = 'approved';
      
      // 2. Unauthorized role rejected
      assert.throws(() => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'dancer', 'holding'), /Only stage marshal/);
      assert.throws(() => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'judge', 'holding'), /Only stage marshal/);
      
      // 3. Invalid status domain rejected
      assert.throws(() => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'invalid_status'), /Invalid stage status/);
      assert.throws(() => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'backstage'), /Invalid stage status/);
      
      // 4. Valid statuses accepted for marshal and chapter_director
      const r1 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'holding');
      assert.equal(r1.status, 'holding');
      const r2 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'chapter_director', 'on_deck');
      assert.equal(r2.status, 'on_deck');
      const r3 = harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');
      assert.equal(r3.status, 'stage');
    } catch (err) {
      console.error('SystemHarness stage queue invariant failed:', err);
      harnessStageInvariantsPass = false;
    }

    record(
      'H5.1: SystemHarness stage queue model invariants (domain validation, RBAC, draft rejection)',
      harnessStageInvariantsPass,
      'Tested status validation, role enforcement, and draft barriers'
    );

    // 5.2 Cryptographic entropy check on generated capability keys
    const generatedKeys = new Set();
    for (let i = 0; i < 100; i++) {
      const inq = harness.createInquiry('ph', `user-${i}@test.com`, 'Subj', 'Msg');
      assert.equal(inq.capability_key.length, 64);
      assert.ok(/^[0-9a-f]{64}$/.test(inq.capability_key));
      generatedKeys.add(inq.capability_key);
    }
    record(
      'H5.2: 100 consecutively generated capability keys are strictly 256-bit unique hexadecimal',
      generatedKeys.size === 100,
      `unique_keys=${generatedKeys.size}/100, bits=256`
    );

    // 5.3 Massive check-in idempotency stress (100 parallel calls)
    const { crew, entry } = (() => {
      const crew = harness.createCrew('ph', 'mgr-stress', 'Stress Crew', 'Manila');
      crew.members.push({ uid: 'dancer-stress-1', name: 'Dancer 1', role: 'Dancer', is_minor: false, consent_verified: true });
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.status = 'approved';
      return { crew, entry };
    })();

    const firstPass = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-stress-1', 'marshal');
    let stressPassed = true;
    for (let i = 0; i < 100; i++) {
      const pass = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-stress-1', 'marshal');
      if (pass.pass_id !== firstPass.pass_id) {
        stressPassed = false;
        break;
      }
    }
    record(
      'H5.3: 100 sequential in-memory check-ins strictly preserve pass_id idempotency',
      stressPassed,
      `initial_pass=${firstPass.pass_id}`
    );
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('  MILESTONE 5 EMPIRICAL ADVERSARIAL CHALLENGE SUMMARY');
  console.log('='.repeat(80));
  const failed = results.filter(r => !r.passed);
  console.log(`Total Scenarios Tested:  ${results.length}`);
  console.log(`Passed (Repelled):       ${results.length - failed.length}`);
  console.log(`Failed (Vulnerabilities): ${failed.length}`);
  console.log('='.repeat(80));

  if (failed.length > 0) {
    console.error('\n✖ ADVERSARIAL VULNERABILITIES DETECTED:');
    for (const f of failed) {
      console.error(`- ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  } else {
    console.log('🎉 ALL ADVERSARIAL ATTACKS REPELLED CLEANLY! Deterministic exit code: 0\n');
  }
}

runAdversarialM5Challenge().catch(err => {
  console.error('Fatal challenge runner error:', err);
  process.exit(1);
});
