import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 1: Feature Coverage (F21 - F30)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupReadyDivisionWithScores() {
    const crew = harness.createCrew('ph', 'mgr-judged', 'Judged Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `d-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'routine.mp3';
    entry.track_duration_secs = 175;
    entry.paid_minor = 600000;
    entry.status = 'approved';

    // Submit scores from staff-judge-1 and staff-judge-2
    const cmd1 = {
      schema_version: 1,
      operation_id: 'op-j1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    const cmd2 = {
      schema_version: 1,
      operation_id: 'op-j2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
      deductions: [],
    };
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd1);
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-2', cmd2);

    return { crew, entry, cmd1, cmd2 };
  }

  // --- Feature 21: Finance Reconciliation & Credit ---
  test('F21-1: Finance staff reconciles pending payment with approval', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-1', 'Fin Crew 1', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `f-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-rec-1', 120000);

    const reconciled = harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(reconciled.status, 'settled');
    assert.equal(entry.paid_minor, 120000);
  });

  test('F21-2: Reconciled payment transitions status to settled', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-2', 'Fin Crew 2', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `f2-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-2', 'ref-rec-2', 120000);

    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(payment.status, 'settled');
    assert.ok(payment.settled_at > 0);
  });

  test('F21-3: Non-finance role cannot reconcile payment (403)', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-3', 'Fin Crew 3', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `f3-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-3', 'ref-rec-3', 120000);

    assert.throws(
      () => harness.reconcilePayment('ph', payment.payment_id, 'judge', true),
      /Only finance or director can reconcile/
    );
  });

  test('F21-4: Reconciling already settled payment is idempotent (no double credit)', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-4', 'Fin Crew 4', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `f4-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-4', 'ref-rec-4', 120000);

    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 120000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 120000, 'Reconcile replay must not double credit');
  });

  test('F21-5: Reconciling payment with approve: false marks status failed', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-5', 'Fin Crew 5', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `f5-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-5', 'ref-rec-5', 120000);

    const result = harness.reconcilePayment('ph', payment.payment_id, 'finance', false);
    assert.equal(result.status, 'failed');
    assert.equal(entry.paid_minor, 0);
  });

  // --- Feature 22: Payment Refund Recording ---
  test('F22-1: Finance staff refunds settled payment successfully', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-1', 'Refund Crew 1', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r1-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-r1', 'ref-r1', 120000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 120000);

    const refunded = harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(refunded.status, 'refunded');
    assert.equal(entry.paid_minor, 0);
  });

  test('F22-2: Refunding non-settled payment fails with 400', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-2', 'Refund Crew 2', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r2-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-r2', 'ref-r2', 120000);

    assert.throws(
      () => harness.refundPayment('ph', payment.payment_id, 'finance'),
      /Only settled payments can be refunded/
    );
  });

  test('F22-3: Non-finance role cannot refund payment (403)', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-3', 'Refund Crew 3', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r3-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-r3', 'ref-r3', 120000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);

    assert.throws(
      () => harness.refundPayment('ph', payment.payment_id, 'judge'),
      /Only finance or director can refund/
    );
  });

  test('F22-4: Replaying refund on already refunded payment is idempotent', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-4', 'Refund Crew 4', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r4-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-r4', 'ref-r4', 120000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(entry.paid_minor, 0);

    harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(entry.paid_minor, 0, 'Replay refund must not debit further');
  });

  test('F22-5: Refunding payment in different chapter throws 404', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-5', 'Refund Crew 5', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r5-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-r5', 'ref-r5', 120000);

    assert.throws(
      () => harness.refundPayment('hk', payment.payment_id, 'finance'),
      /Payment not found/
    );
  });

  // --- Feature 23: Finance Summary & Ledger Reporting ---
  test('F23-1: Finance summary reports total settled amount accurately', () => {
    const crew = harness.createCrew('ph', 'mgr-sum-1', 'Sum Crew 1', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s1-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-s1', 'ref-s1', 120000);
    harness.reconcilePayment('ph', p1.payment_id, 'finance', true);

    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.total_settled_minor, 120000);
    assert.equal(summary.currency, 'PHP');
  });

  test('F23-2: Finance summary reports total pending reservations', () => {
    const crew = harness.createCrew('ph', 'mgr-sum-2', 'Sum Crew 2', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s2-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-s2', 'ref-s2', 120000);

    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.total_pending_minor, 120000);
  });

  test('F23-3: Finance summary reports total refunded amount', () => {
    const crew = harness.createCrew('ph', 'mgr-sum-3', 'Sum Crew 3', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s3-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-s3', 'ref-s3', 120000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.refundPayment('ph', p.payment_id, 'finance');

    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.total_refunded_minor, 120000);
  });

  test('F23-4: Finance summary accurately reflects total transaction count', () => {
    const crew = harness.createCrew('ph', 'mgr-sum-4', 'Sum Crew 4', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s4-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-s4a', 'ref-s4a', 60000);
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-s4b', 'ref-s4b', 60000);

    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.transaction_count, 2);
  });

  test('F23-5: Finance summary isolates transactions across chapters', () => {
    // HK chapter transaction
    const crewHk = harness.createCrew('hk', 'mgr-hk-sum', 'HK Crew', 'Kowloon');
    for (let i = 1; i <= 2; i++) {
      crewHk.members.push({ uid: `hk-d-${i}`, name: `HK D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    harness.events.set('hk-event-2027', { id: 'hk-event-2027', chapter_id: 'hk', name: 'HK 2027', status: 'active', rules_version: '1' });
    harness.divisions.set('hk-event-2027:open-crew', { id: 'open-crew', name: 'Open', min_members: 1, max_members: 10, max_duration_secs: 180, fee_minor: 100000 });
    const entryHk = harness.createEntryDraft('hk', 'hk-event-2027', crewHk.id, 'open-crew');
    harness.requestPayment('hk', 'hk-event-2027', entryHk.id, 'payer-hk', 'ref-hk-1', 100000);

    const summaryPh = harness.getFinanceSummary('ph');
    const summaryHk = harness.getFinanceSummary('hk');
    assert.equal(summaryPh.transaction_count, 0);
    assert.equal(summaryHk.transaction_count, 1);
  });

  // --- Feature 24: Judge Score Submission ---
  test('F24-1: Assigned judge submits 100-pt rubric score successfully', () => {
    const { crew } = setupReadyDivisionWithScores();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-j3-valid',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      deductions: [],
    };
    const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', cmd);
    assert.equal(receipt.net_score, 100);
    assert.equal(receipt.score_revision, 1);
  });

  test('F24-2: Duplicate submission with identical payload returns cached receipt', () => {
    const { crew } = setupReadyDivisionWithScores();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-j3-dup',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    const r1 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', cmd);
    const r2 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', cmd);
    assert.equal(r1.receipt_id, r2.receipt_id);
  });

  test('F24-3: Submitting modified payload for existing operation_id fails with 409', () => {
    const { crew } = setupReadyDivisionWithScores();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-tamper',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', cmd);
    const tampered = { ...cmd, criteria: { ...cmd.criteria, execution: 19 } };
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', tampered),
      /Operation ID reused with modified payload/
    );
  });

  test('F24-4: Criteria scores exceeding 20.0 fail with 400', () => {
    const { crew } = setupReadyDivisionWithScores();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-overflow',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 21, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', cmd),
      /Criteria scores must be between 0 and 20/
    );
  });

  test('F24-5: Unassigned judge submitting score fails with 403', () => {
    const { crew } = setupReadyDivisionWithScores();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-unassigned',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'unassigned-judge-uid', cmd),
      /Judge not assigned to division panel/
    );
  });

  // --- Feature 25: Head Judge Technical Deductions ---
  test('F25-1: Head judge records technical deductions successfully', () => {
    const { crew } = setupReadyDivisionWithScores();
    const deductions = [
      { code: 'overtime', reason: 'Routine exceeded time limit', points: 1.5 },
      { code: 'clothing', reason: 'Dropped wardrobe item', points: 0.5 },
    ];
    const res = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', deductions);
    assert.equal(res.total_deductions, 2.0);
  });

  test('F25-2: Regular judge cannot set technical deductions (403)', () => {
    const { crew } = setupReadyDivisionWithScores();
    assert.throws(
      () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'judge', [{ code: 'test', reason: 't', points: 1 }]),
      /Only head judge can set technical deductions/
    );
  });

  test('F25-3: Negative deduction points are rejected with 400', () => {
    const { crew } = setupReadyDivisionWithScores();
    assert.throws(
      () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'cheat', reason: 'Negative', points: -2 }]),
      /Deductions must be non-negative/
    );
  });

  test('F25-4: Replaying deduction update replaces prior deductions idempotently', () => {
    const { crew } = setupReadyDivisionWithScores();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'd1', reason: 'First', points: 1.0 }]);
    const res2 = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'd2', reason: 'Second', points: 3.0 }]);
    assert.equal(res2.total_deductions, 3.0);
  });

  test('F25-5: Altering deductions after division is locked fails with 409', () => {
    const { crew } = setupReadyDivisionWithScores();
    // Complete 3rd score and lock
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-j3-lock',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'late', reason: 'Late', points: 1 }]),
      /Division is locked; cannot alter deductions/
    );
  });

  // --- Feature 26: Division Locking Barrier ---
  test('F26-1: Locking division succeeds when all panel scorecards are present', () => {
    const { crew } = setupReadyDivisionWithScores();
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-j3-lock-ok',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    const lock = harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    assert.equal(lock.locked, true);
  });

  test('F26-2: Locking division before all panel scorecards are in fails with 409', () => {
    setupReadyDivisionWithScores(); // only judge 1 and 2 submitted, judge 3 is missing
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /Missing score from judge/
    );
  });

  test('F26-3: Locking division before entries are approved fails with 409', () => {
    const { entry } = setupReadyDivisionWithScores();
    entry.status = 'submitted'; // not approved
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /is not approved/
    );
  });

  test('F26-4: Submitting score after division lock fails with 409', () => {
    const { crew } = setupReadyDivisionWithScores();
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-j3-lock-ok2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-after-lock',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 1,
        criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
        deductions: [],
      }),
      /Division is locked; cannot submit score/
    );
  });

  test('F26-5: Re-locking an already locked division is idempotent', () => {
    const { crew } = setupReadyDivisionWithScores();
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-j3-lock-ok3',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const relock = harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    assert.equal(relock.locked, true);
    assert.equal(relock.alreadyLocked, true);
  });

  // --- Feature 27: Judge Lineup Projection ---
  test('F27-1: Judge retrieves assigned division lineup', () => {
    const { entry } = setupReadyDivisionWithScores();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.ok(lineup.items.length >= 1);
    assert.equal(lineup.items[0].entry_id, entry.id);
  });

  test('F27-2: Lineup item indicates whether scorecard has been completed', () => {
    const { entry } = setupReadyDivisionWithScores();
    const lineupJ1 = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    const lineupJ3 = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-3');
    const itemJ1 = lineupJ1.items.find(i => i.entry_id === entry.id);
    const itemJ3 = lineupJ3.items.find(i => i.entry_id === entry.id);
    assert.equal(itemJ1.completed, true);
    assert.equal(itemJ3.completed, false);
  });

  test('F27-3: Lineup supports bounded pagination with cursor', () => {
    setupReadyDivisionWithScores();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1', 1);
    assert.equal(lineup.items.length, 1);
  });

  test('F27-4: Non-assigned judge receives empty lineup', () => {
    setupReadyDivisionWithScores();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'unassigned-uid');
    assert.equal(lineup.items.length, 0);
  });

  test('F27-5: Lineup projection omits private scores and competitor notes', () => {
    setupReadyDivisionWithScores();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    const text = JSON.stringify(lineup);
    assert.ok(!text.includes('choreography'));
    assert.ok(!text.includes('deductions'));
  });

  // --- Feature 28: Offline Outbox & Web Locks Sync ---
  test('F28-1: Draft outbox operations remain local until flushed', async () => {
    const store = harness.createOutboxStore();
    const draft = { key: 'op-local-1', owner: 'judge-1', state: 'draft' };
    await store.put(draft);

    const listed = await store.list('judge-1');
    assert.equal(listed.length, 1);
    assert.equal(listed[0].state, 'draft');
  });

  test('F28-2: Outbox isolates stored operations by owner UID', async () => {
    const store = harness.createOutboxStore();
    await store.put({ key: 'op-1', owner: 'judge-1', state: 'queued' });
    await store.put({ key: 'op-2', owner: 'judge-2', state: 'queued' });

    const j1 = await store.list('judge-1');
    const j2 = await store.list('judge-2');
    assert.equal(j1.length, 1);
    assert.equal(j2.length, 1);
    assert.equal(j1[0].owner, 'judge-1');
  });

  test('F28-3: Outbox operation can be marked acknowledged on server receipt', async () => {
    const store = harness.createOutboxStore();
    const op = { key: 'op-sync', owner: 'judge-1', state: 'queued' };
    await store.put(op);

    // Simulate commit & receipt acknowledgement
    op.state = 'acknowledged';
    op.receipt = { receipt_id: 'rcpt-sync-1' };
    await store.put(op);

    const updated = await store.list('judge-1');
    assert.equal(updated[0].state, 'acknowledged');
    assert.equal(updated[0].receipt.receipt_id, 'rcpt-sync-1');
  });

  test('F28-4: Outbox operation records conflict state on 409 rejection', async () => {
    const store = harness.createOutboxStore();
    const op = { key: 'op-conf', owner: 'judge-1', state: 'queued' };
    await store.put(op);

    op.state = 'conflict';
    await store.put(op);

    const updated = await store.list('judge-1');
    assert.equal(updated[0].state, 'conflict');
  });

  test('F28-5: Removing acknowledged outbox item clears local record', async () => {
    const store = harness.createOutboxStore();
    await store.put({ key: 'op-del', owner: 'judge-1', state: 'acknowledged' });
    assert.equal((await store.list('judge-1')).length, 1);

    await store.remove('op-del');
    assert.equal((await store.list('judge-1')).length, 0);
  });

  // --- Feature 29: BG.ONE Battle Corner Voting ---
  test('F29-1: Battle match created with 3-judge panel', () => {
    const battle = harness.createBattle(
      'manila-session-2027',
      'match-1',
      'Breaking',
      'Finals',
      'B-Boy Alpha',
      'B-Boy Omega',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    assert.equal(battle.status, 'active');
    assert.equal(battle.panel.length, 3);
  });

  test('F29-2: Judge casts red corner vote successfully', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-2',
      'Breaking',
      'Semi-Finals',
      'Red D',
      'Blue D',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    const updated = harness.voteBattle('manila-session-2027', 'match-2', 'staff-judge-1', 'red');
    assert.equal(updated.votes_red, 1);
    assert.equal(updated.votes_blue, 0);
  });

  test('F29-3: Re-voting same corner by same judge is idempotent', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-3',
      'Breaking',
      'Quarter-Finals',
      'Red D',
      'Blue D',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    harness.voteBattle('manila-session-2027', 'match-3', 'staff-judge-1', 'red');
    const updated = harness.voteBattle('manila-session-2027', 'match-3', 'staff-judge-1', 'red');
    assert.equal(updated.votes_red, 1);
  });

  test('F29-4: Attempting to change corner ballot fails with 409', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-4',
      'Breaking',
      'Round 1',
      'Red D',
      'Blue D',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    harness.voteBattle('manila-session-2027', 'match-4', 'staff-judge-1', 'red');
    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'match-4', 'staff-judge-1', 'blue'),
      /Judge cannot change corner ballot once submitted/
    );
  });

  test('F29-5: Majority votes immediately closes battle and declares winner', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-5',
      'Breaking',
      'Finals',
      'Red Champ',
      'Blue Champ',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    harness.voteBattle('manila-session-2027', 'match-5', 'staff-judge-1', 'red');
    const closed = harness.voteBattle('manila-session-2027', 'match-5', 'staff-judge-2', 'red');
    assert.equal(closed.winner_corner, 'red');
    assert.equal(closed.status, 'closed');
  });

  // --- Feature 30: Battle Progression & Durability ---
  test('F30-1: Closed battle rejects subsequent votes with 409', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-prog-1',
      'Popping',
      'Finals',
      'Red P',
      'Blue P',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    harness.voteBattle('manila-session-2027', 'match-prog-1', 'staff-judge-1', 'blue');
    harness.voteBattle('manila-session-2027', 'match-prog-1', 'staff-judge-2', 'blue');

    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'match-prog-1', 'staff-judge-3', 'red'),
      /Battle is already closed/
    );
  });

  test('F30-2: Unassigned judge voting in battle is rejected with 403', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-prog-2',
      'Popping',
      'Finals',
      'Red P',
      'Blue P',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'match-prog-2', 'unassigned-uid', 'red'),
      /Judge not on battle panel/
    );
  });

  test('F30-3: Battle retrieval accurately reflects vote counts', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-prog-3',
      'Popping',
      'Semi-Finals',
      'Red P',
      'Blue P',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    harness.voteBattle('manila-session-2027', 'match-prog-3', 'staff-judge-1', 'red');
    harness.voteBattle('manila-session-2027', 'match-prog-3', 'staff-judge-2', 'blue');

    const battle = harness.getBattle('manila-session-2027', 'match-prog-3');
    assert.equal(battle.votes_red, 1);
    assert.equal(battle.votes_blue, 1);
    assert.equal(battle.status, 'active');
  });

  test('F30-4: Non-existent match retrieval throws 404', () => {
    assert.throws(
      () => harness.getBattle('manila-session-2027', 'ghost-match'),
      /Battle match not found/
    );
  });

  test('F30-5: Invalid corner string throws 400', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-prog-5',
      'Popping',
      'Finals',
      'Red P',
      'Blue P',
      ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']
    );
    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'match-prog-5', 'staff-judge-1', 'green'),
      /Corner must be red or blue/
    );
  });
});
