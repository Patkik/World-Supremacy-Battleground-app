import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness } from '../harness/system_harness.mjs';

test.describe('Tier 4: Real-World Scenarios - Offline & Disruption Recovery', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  // T4-13: Judge Device Network Drop & Outbox Recovery
  test('T4-13: Offline Outbox Queue & Reconnect: Disconnected judge drains buffered scores upon reconnect', async () => {
    const crew = harness.createCrew('ph', 'mgr-outbox', 'Outbox Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-ob-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-ob-0', 'ref-ob', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Client outbox storage simulation
    const outbox = harness.createOutboxStore();
    const queuedScore = {
      key: 'score-ob-1',
      owner: 'staff-judge-1',
      payload: {
        schema_version: 1,
        operation_id: 'op-offline-sync-1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
      },
    };

    // Device is offline: save in local outbox
    await outbox.put(queuedScore);
    const pending = await outbox.list('staff-judge-1');
    assert.equal(pending.length, 1);

    // Network restores: flush outbox to server
    for (const item of pending) {
      const receipt = harness.submitScore('ph', 'manila-session-2027', item.owner, item.payload);
      assert.ok(receipt.receipt_id);
      assert.equal(receipt.net_score, 85);
      await outbox.remove(item.key);
    }

    const remaining = await outbox.list('staff-judge-1');
    assert.equal(remaining.length, 0);
  });

  // T4-14: Score Revision Optimistic Locking
  test('T4-14: Score Revision Optimistic Locking: Conflicting revisions rejected, sequential revision accepted', () => {
    const crew = harness.createCrew('ph', 'mgr-rev', 'Revision Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-rev-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-rev-0', 'ref-rev', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Submit initial score (rev 1)
    const rcpt1 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
    });
    assert.equal(rcpt1.score_revision, 1);
    assert.equal(rcpt1.net_score, 75);

    // Stale submission attempt (expected_revision: 0) rejected with 409
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-rev-2-stale',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      }),
      err => err.status === 409
    );

    // Valid revision (expected_revision: 1) succeeds and bumps to revision 2
    const rcpt2 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-2-fresh',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 1,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
    });
    assert.equal(rcpt2.score_revision, 2);
    assert.equal(rcpt2.net_score, 90);
  });

  // T4-15: Roster Substitution Under Marshal Inspection
  test('T4-15: Dancer Emergency Substitution: Alternate replaces injured dancer with readiness preserved', () => {
    const crew = harness.createCrew('ph', 'mgr-subst', 'Sub Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `orig-d-${i}`, name: `Orig ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // Injured dancer replaced with alternate before submission
    const newRoster = entry.roster.filter(m => m.uid !== 'orig-d-4');
    newRoster.push({
      uid: 'alt-dancer-1',
      name: 'Alternate Dancer',
      dob: '2001-01-01',
      role: 'Dancer',
      is_minor: false,
      consent_verified: true,
    });
    harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, newRoster);

    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'orig-d-0', 'ref-sub', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Alternate checks in successfully
    const pass = harness.checkInDancer('ph', 'manila-session-2027', 'alt-dancer-1', 'marshal');
    assert.equal(pass.dancer_uid, 'alt-dancer-1');
  });

  // T4-16: Payment Webhook Duplicate Delivery Resilience
  test('T4-16: Webhook Idempotency: Duplicate payment webhooks settle funds exactly once without double balance', () => {
    const crew = harness.createCrew('ph', 'mgr-dup-hook', 'Hook Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-hk-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-hk-0', 'ref-hk', 600000);

    const rawPayload = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const hmacSig = crypto.createHmac('sha256', 'demo-secret').update(rawPayload).digest('hex');

    // Deliver 5 identical webhooks
    for (let i = 0; i < 5; i++) {
      harness.processSyntheticWebhook(hmacSig, rawPayload, 'demo-secret');
    }

    // Exact single balance credited
    assert.equal(entry.paid_minor, 600000);
  });

  // T4-17: Guardian Consent Revocation Mid-Flight
  test('T4-17: Guardian Revocation: Consent removal halts entry readiness and approval', () => {
    const crew = harness.createCrew('ph', 'mgr-revk', 'Revocation Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `revk-d-${i}`,
        name: `D ${i}`,
        dob: '2012-01-01',
        role: 'Dancer',
        is_minor: true,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'revk-d-0', 'ref-rvk', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);

    // Guardian explicitly revokes consent for dancer 0
    entry.roster.find(m => m.uid === 'revk-d-0').consent_verified = false;

    // Readiness is revoked
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.consent_ready, false);
    assert.equal(readiness.is_ready, false);

    // Approval blocked
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true),
      err => err.status === 400
    );
  });

  // T4-18: Concurrent Judge Ballot Submissions
  test('T4-18: Concurrent Judge Ballots: Parallel scorecard submissions succeed with unique receipts', () => {
    const crew = harness.createCrew('ph', 'mgr-conc', 'Concurrent Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-cc-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-cc-0', 'ref-cc', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    const judges = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];
    const receipts = judges.map((jUid, idx) => {
      return harness.submitScore('ph', 'manila-session-2027', jUid, {
        schema_version: 1,
        operation_id: `op-concurrent-${jUid}`,
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 16 + idx, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      });
    });

    const uniqueReceiptIds = new Set(receipts.map(r => r.receipt_id));
    assert.equal(uniqueReceiptIds.size, 3);
  });

  // T4-19: Invalid Audio Upload Replacement
  test('T4-19: Invalid Audio Recovery: Non-compliant audio rejected, compliant re-upload restores readiness', () => {
    const crew = harness.createCrew('ph', 'mgr-aud-rec', 'Audio Recovery Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-ar-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // 0 or negative duration rejected
    assert.throws(
      () => harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'empty.mp3', 0),
      err => err.status === 400
    );

    // Overlength track (division limit 180s + 5s grace = 185s; track 200s is non-compliant)
    const over = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'too_long.mp3', 200);
    assert.equal(over.compliant, false);
    assert.equal(harness.evaluateReadiness(entry).music_ready, false);

    // Replacement with compliant track (175s) succeeds
    const ok = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'correct_length.mp3', 175);
    assert.equal(ok.compliant, true);
    assert.equal(harness.evaluateReadiness(entry).music_ready, true);
  });

  // T4-20: Inquiry Escalation & Capability Key Access
  test('T4-20: Capability Key Recovery: Public token allows viewing inquiry independent of auth session', () => {
    const created = harness.createInquiry('ph', 'troubled@wsb.org', 'Music File Trouble', 'Audio uploader dropped on field.');
    assert.ok(created.capability_key);

    // Competitor accesses ticket via capability key
    const inq = harness.getInquiryByCapability(created.inquiry_id, created.capability_key);
    assert.equal(inq.subject, 'Music File Trouble');

    // Tampered capability key is forbidden
    assert.throws(
      () => harness.getInquiryByCapability(created.inquiry_id, 'tampered-key-12345'),
      err => err.status === 403
    );
  });

  // T4-21: Attempted Premature Division Lock Barrier
  test('T4-21: Premature Division Lock: Rejection when judge scores incomplete, success after full submission', () => {
    const crew = harness.createCrew('ph', 'mgr-premature', 'Premature Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-pm-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-pm-0', 'ref-pm', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Only 2 of 3 judges submit
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-pm-1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
    });
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-pm-2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
    });

    // Premature lock attempt rejected
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      err => err.status === 409
    );

    // Final judge submits
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-pm-3',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
    });

    // Division lock now succeeds
    const lock = harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    assert.equal(lock.locked, true);
  });

  // T4-22: Battle Split Decision Sudden Death
  test('T4-22: Battle Split Decision: 2-1 vote instantly decides winner and closes battle', () => {
    const battle = harness.createBattle(
      'manila-session-2027',
      'match-split-1',
      'all_styles',
      'finals',
      'Red Warrior',
      'Blue Knight',
      ['judge-b1', 'judge-b2', 'judge-b3']
    );

    harness.voteBattle('manila-session-2027', 'match-split-1', 'judge-b1', 'red');
    harness.voteBattle('manila-session-2027', 'match-split-1', 'judge-b2', 'blue');
    assert.equal(harness.getBattle('manila-session-2027', 'match-split-1').status, 'active');

    // Deciding vote for Red
    harness.voteBattle('manila-session-2027', 'match-split-1', 'judge-b3', 'red');
    const closed = harness.getBattle('manila-session-2027', 'match-split-1');
    assert.equal(closed.status, 'closed');
    assert.equal(closed.winner_corner, 'red');
    assert.equal(closed.votes_red, 2);
    assert.equal(closed.votes_blue, 1);
  });

  // T4-23: Token Expiry Mid-Judging & Refresh Re-auth
  test('T4-23: Token Expiration & Refresh: Expired judge token rejected, renewed token continues evaluation', () => {
    const expiredToken = harness.createToken({
      sub: 'judge-exp',
      role: 'judge',
      chapterId: 'ph',
      exp: Math.floor(Date.now() / 1000) - 10,
    });

    assert.throws(
      () => harness.verifyToken(expiredToken, 'ph'),
      err => err.status === 401
    );

    const freshToken = harness.createToken({
      sub: 'judge-exp',
      role: 'judge',
      chapterId: 'ph',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const verified = harness.verifyToken(freshToken, 'ph');
    assert.equal(verified.sub, 'judge-exp');
  });

  // T4-24: Partial Split Payment Abandonment & Final Balance Settlement
  test('T4-24: Split Payment Abandonment: Incomplete split payment rectified by remaining balance settlement', () => {
    const crew = harness.createCrew('ph', 'mgr-split-rec', 'Split Rec Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-sr-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);

    // First split payment: 240,000 / 600,000
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-sr-0', 'ref-p1', 240000);
    harness.reconcilePayment('ph', p1.payment_id, 'finance', true);

    // Entry is not ready yet
    assert.equal(harness.evaluateReadiness(entry).payment_ready, false);

    // Remaining payment: 360,000
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-sr-1', 'ref-p2', 360000);
    harness.reconcilePayment('ph', p2.payment_id, 'finance', true);

    // Total now 600,000 -> payment ready
    assert.equal(harness.evaluateReadiness(entry).payment_ready, true);
  });

  // T4-25: Post-Publication Snapshot Tamper Resistance
  test('T4-25: Publication Tamper Resistance: Post-publication modifications blocked and canonical digest intact', () => {
    const crew = harness.createCrew('ph', 'mgr-tamper', 'Tamper Res Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-tp-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-tp-0', 'ref-tp', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-tp-${j}`,
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
      });
    }

    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const originalDigest = pub.digest;

    // Late score submission is strictly rejected
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-late-illegal',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 1,
        criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      }),
      err => err.status === 409
    );

    // Published snapshot remains identical
    const projection = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.equal(projection.digest, originalDigest);
    assert.equal(projection.standings[0].final_score, 85);
  });
});
