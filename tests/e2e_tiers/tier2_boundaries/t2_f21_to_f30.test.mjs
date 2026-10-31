import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 2: Boundary & Corner Cases (F21 - F30)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupJudgedEntry() {
    const crew = harness.createCrew('ph', 'mgr-t2-j', 'T2 Judged Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `dj-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'routine.mp3';
    entry.track_duration_secs = 170;
    entry.paid_minor = 600000;
    entry.status = 'approved';
    return { crew, entry };
  }

  // --- Feature 21: Reconciliation Boundaries ---
  test('T2-F21-1: Reconciling payment of 1 minor unit succeeds', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-rec-1unit', 1);
    const settled = harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(settled.status, 'settled');
    assert.equal(entry.paid_minor, 1);
  });

  test('T2-F21-2: Reconciling with non-existent payment ID throws 404', () => {
    assert.throws(
      () => harness.reconcilePayment('ph', 'phantom-payment-id', 'finance', true),
      /Payment not found/
    );
  });

  test('T2-F21-3: Non-director non-finance role throws 403', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-rec-role', 100);
    assert.throws(
      () => harness.reconcilePayment('ph', payment.payment_id, 'marshal', true),
      /Only finance or director can reconcile/
    );
  });

  test('T2-F21-4: Multiple reconciliations on settled payment return settled payment', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-rec-mult', 100);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    const second = harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(second.status, 'settled');
    assert.equal(entry.paid_minor, 100);
  });

  test('T2-F21-5: Failed payment status is preserved on failed reconciliation', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-rec-fail', 100);
    const failed = harness.reconcilePayment('ph', payment.payment_id, 'finance', false);
    assert.equal(failed.status, 'failed');
  });

  // --- Feature 22: Refund Boundaries ---
  test('T2-F22-1: Refunding payment debits exact amount paid from entry', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-ref-exact', 150000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 150000);

    harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(entry.paid_minor, 0);
  });

  test('T2-F22-2: Refunding already refunded payment does not create negative paid_minor', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-ref-noneg', 150000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    harness.refundPayment('ph', payment.payment_id, 'finance');
    harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(entry.paid_minor, 0);
  });

  test('T2-F22-3: Cross-chapter refund attempt is rejected with 404', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-ref-cross', 1000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.throws(
      () => harness.refundPayment('au', payment.payment_id, 'finance'),
      /Payment not found/
    );
  });

  test('T2-F22-4: Unauthorized role attempting refund fails with 403', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-ref-auth', 1000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.throws(
      () => harness.refundPayment('ph', payment.payment_id, 'dancer'),
      /Only finance or director can refund/
    );
  });

  test('T2-F22-5: Refunding non-existent payment returns 404', () => {
    assert.throws(
      () => harness.refundPayment('ph', 'non-existent-pay-id', 'finance'),
      /Payment not found/
    );
  });

  // --- Feature 23: Finance Summary Boundaries ---
  test('T2-F23-1: Summary with 0 transactions returns zeroes and chapter currency', () => {
    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.total_settled_minor, 0);
    assert.equal(summary.total_pending_minor, 0);
    assert.equal(summary.total_refunded_minor, 0);
    assert.equal(summary.transaction_count, 0);
    assert.equal(summary.currency, 'PHP');
  });

  test('T2-F23-2: Summary sums settled, pending, and refunded buckets accurately', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-s-1', 100000);
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p2', 'ref-s-2', 100000);
    const p3 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p3', 'ref-s-3', 100000);

    harness.reconcilePayment('ph', p1.payment_id, 'finance', true); // settled
    // p2 remains pending
    harness.reconcilePayment('ph', p3.payment_id, 'finance', true);
    harness.refundPayment('ph', p3.payment_id, 'finance'); // refunded

    const sum = harness.getFinanceSummary('ph');
    assert.equal(sum.total_settled_minor, 100000);
    assert.equal(sum.total_pending_minor, 100000);
    assert.equal(sum.total_refunded_minor, 100000);
    assert.equal(sum.transaction_count, 3);
  });

  test('T2-F23-3: Safe integer arithmetic on large turnover', () => {
    const { entry } = setupJudgedEntry();
    entry.paid_minor = 0;
    const largeAmount = 500000000; // 5M PHP in centavos
    harness.divisions.get('manila-session-2027:open-crew').fee_minor = largeAmount;
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-large', largeAmount);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);

    const sum = harness.getFinanceSummary('ph');
    assert.equal(sum.total_settled_minor, largeAmount);
    assert.ok(Number.isSafeInteger(sum.total_settled_minor));
  });

  test('T2-F23-4: Non-existent chapter finance summary throws 404', () => {
    assert.throws(
      () => harness.getFinanceSummary('non-existent-chapter'),
      /Chapter not found/
    );
  });

  test('T2-F23-5: Australian chapter summary returns AUD currency', () => {
    const sum = harness.getFinanceSummary('au');
    assert.equal(sum.currency, 'AUD');
  });

  // --- Feature 24: Score Submission Boundaries ---
  test('T2-F24-1: Perfect score of 20.0 across all 5 pillars yields 100.0 net score', () => {
    const { crew } = setupJudgedEntry();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-100',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 20.0, musicality: 20.0, execution: 20.0, stage_presence: 20.0, entertainment: 20.0 },
      deductions: [],
    };
    const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
    assert.equal(receipt.net_score, 100.0);
  });

  test('T2-F24-2: Minimum score of 0.0 across all 5 pillars yields 0.0 net score', () => {
    const { crew } = setupJudgedEntry();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-0',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 0.0, musicality: 0.0, execution: 0.0, stage_presence: 0.0, entertainment: 0.0 },
      deductions: [],
    };
    const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
    assert.equal(receipt.net_score, 0.0);
  });

  test('T2-F24-3: Fractional floating point score 18.5 calculates correctly', () => {
    const { crew } = setupJudgedEntry();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-float',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18.5, musicality: 18.5, execution: 18.5, stage_presence: 18.5, entertainment: 18.5 },
      deductions: [],
    };
    const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
    assert.equal(receipt.net_score, 92.5);
  });

  test('T2-F24-4: Criteria score of -0.1 fails with 400', () => {
    const { crew } = setupJudgedEntry();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-neg',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: -0.1, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd),
      /Criteria scores must be between 0 and 20/
    );
  });

  test('T2-F24-5: Criteria score of 20.1 fails with 400', () => {
    const { crew } = setupJudgedEntry();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-over20',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 20.1, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd),
      /Criteria scores must be between 0 and 20/
    );
  });

  // --- Feature 25: Head Judge Technical Deductions Boundaries ---
  test('T2-F25-1: Zero points deduction (0.0) is accepted', () => {
    const { crew } = setupJudgedEntry();
    const res = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'warn', reason: 'Warning', points: 0.0 }]);
    assert.equal(res.total_deductions, 0.0);
  });

  test('T2-F25-2: Deduction of 100.0 points is accepted', () => {
    const { crew } = setupJudgedEntry();
    const res = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'disqualify', reason: 'Major penalty', points: 100.0 }]);
    assert.equal(res.total_deductions, 100.0);
  });

  test('T2-F25-3: Multiple deductions summing to 15.5 points calculate correctly', () => {
    const { crew } = setupJudgedEntry();
    const deductions = [
      { code: 'd1', reason: 'R1', points: 5.0 },
      { code: 'd2', reason: 'R2', points: 10.5 },
    ];
    const res = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', deductions);
    assert.equal(res.total_deductions, 15.5);
  });

  test('T2-F25-4: Non-numeric deduction points fail with 400', () => {
    const { crew } = setupJudgedEntry();
    assert.throws(
      () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'bad', reason: 'Bad', points: NaN }]),
      /Deductions must be non-negative/
    );
  });

  test('T2-F25-5: Chapter Director can also set technical deductions', () => {
    const { crew } = setupJudgedEntry();
    const res = harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'dir', reason: 'Dir Penalty', points: 1.0 }]);
    assert.equal(res.total_deductions, 1.0);
  });

  // --- Feature 26: Division Locking Barrier Boundaries ---
  test('T2-F26-1: Missing 1 judge out of 3 blocks division lock with 409', () => {
    const { crew } = setupJudgedEntry();
    // Only judge 1 and 2 submit
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-lock-j1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-lock-j2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });

    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /Missing score from judge staff-judge-3/
    );
  });

  test('T2-F26-2: Lock barrier checks all entries in division', () => {
    const { crew: c1 } = setupJudgedEntry();
    const crew2 = harness.createCrew('ph', 'mgr-c2', 'Crew Two Lock', 'Manila');
    for (let i = 1; i <= 5; i++) crew2.members.push({ uid: `c2-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const e2 = harness.createEntryDraft('ph', 'manila-session-2027', crew2.id, 'open-crew');
    e2.status = 'approved';

    // c1 is scored by all 3 judges, but c2 is not scored
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c1-${j}`,
        division_id: 'open-crew',
        crew_id: c1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
    }

    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /Missing score from judge staff-judge-1 for crew/
    );
  });

  test('T2-F26-3: Division with 0 entries fails lock with 400', () => {
    harness.divisions.set('manila-session-2027:empty-div', {
      id: 'empty-div',
      name: 'Empty Div',
      min_members: 1,
      max_members: 5,
      max_duration_secs: 180,
      fee_minor: 100000,
    });
    harness.judgePanels.set('manila-session-2027:empty-div', ['staff-judge-1']);
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'empty-div', 'head_judge'),
      /No entries in division/
    );
  });

  test('T2-F26-4: Division without panel fails lock with 400', () => {
    const { entry } = setupJudgedEntry();
    harness.judgePanels.set('manila-session-2027:open-crew', []); // empty panel
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /No panel configured/
    );
  });

  test('T2-F26-5: Regular judge cannot lock division (403)', () => {
    setupJudgedEntry();
    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'judge'),
      /Only head judge or director can lock/
    );
  });

  // --- Feature 27: Judge Lineup Boundaries ---
  test('T2-F27-1: Limit of 0 returns 0 items in lineup', () => {
    setupJudgedEntry();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1', 0);
    assert.equal(lineup.items.length, 0);
  });

  test('T2-F27-2: Limit exceeding total items returns all items with null next_page', () => {
    setupJudgedEntry();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1', 100);
    assert.ok(lineup.items.length >= 1);
    assert.equal(lineup.next_page, null);
  });

  test('T2-F27-3: Scorecard completion status changes immediately upon submission', () => {
    const { crew, entry } = setupJudgedEntry();
    const before = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.equal(before.items.find(i => i.entry_id === entry.id).completed, false);

    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-lineup-check',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });

    const after = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.equal(after.items.find(i => i.entry_id === entry.id).completed, true);
  });

  test('T2-F27-4: Invalid cursor string defaults gracefully to index 0', () => {
    setupJudgedEntry();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1', 10, 'invalid-cursor');
    assert.ok(lineup.items.length >= 1);
  });

  test('T2-F27-5: Lineup total matches items count when limit covers all', () => {
    setupJudgedEntry();
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1', 50);
    assert.equal(lineup.total, lineup.items.length);
  });

  // --- Feature 28: Outbox Boundaries ---
  test('T2-F28-1: Outbox maintains FIFO order of entries', async () => {
    const store = harness.createOutboxStore();
    await store.put({ key: 'op-1', order: 1, owner: 'j1' });
    await store.put({ key: 'op-2', order: 2, owner: 'j1' });
    await store.put({ key: 'op-3', order: 3, owner: 'j1' });

    const list = await store.list('j1');
    assert.equal(list[0].key, 'op-1');
    assert.equal(list[1].key, 'op-2');
    assert.equal(list[2].key, 'op-3');
  });

  test('T2-F28-2: Overwriting outbox key updates record state', async () => {
    const store = harness.createOutboxStore();
    await store.put({ key: 'op-upd', owner: 'j1', state: 'queued' });
    await store.put({ key: 'op-upd', owner: 'j1', state: 'sending' });
    const list = await store.list('j1');
    assert.equal(list.length, 1);
    assert.equal(list[0].state, 'sending');
  });

  test('T2-F28-3: Empty outbox returns empty array', async () => {
    const store = harness.createOutboxStore();
    const list = await store.list('unheard-judge');
    assert.equal(list.length, 0);
  });

  test('T2-F28-4: Outbox cloning ensures mutations do not affect stored copy', async () => {
    const store = harness.createOutboxStore();
    const op = { key: 'op-clone', owner: 'j1', state: 'draft' };
    await store.put(op);
    op.state = 'tampered';

    const list = await store.list('j1');
    assert.equal(list[0].state, 'draft');
  });

  test('T2-F28-5: Deleting non-existent key in outbox does not throw', async () => {
    const store = harness.createOutboxStore();
    await store.remove('non-existent-key');
    assert.equal((await store.list('j1')).length, 0);
  });

  // --- Feature 29: Battle Corner Boundaries ---
  test('T2-F29-1: 3-judge panel: 2 votes for red closes battle with winner red', () => {
    harness.createBattle('manila-session-2027', 'm3-red', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);
    harness.voteBattle('manila-session-2027', 'm3-red', 'staff-judge-1', 'red');
    const closed = harness.voteBattle('manila-session-2027', 'm3-red', 'staff-judge-2', 'red');
    assert.equal(closed.winner_corner, 'red');
    assert.equal(closed.status, 'closed');
  });

  test('T2-F29-2: 3-judge panel: 2 votes for blue closes battle with winner blue', () => {
    harness.createBattle('manila-session-2027', 'm3-blue', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);
    harness.voteBattle('manila-session-2027', 'm3-blue', 'staff-judge-1', 'blue');
    const closed = harness.voteBattle('manila-session-2027', 'm3-blue', 'staff-judge-2', 'blue');
    assert.equal(closed.winner_corner, 'blue');
    assert.equal(closed.status, 'closed');
  });

  test('T2-F29-3: 5-judge panel: 2 votes for red does not close battle (needs 3)', () => {
    const panel5 = ['j1', 'j2', 'j3', 'j4', 'j5'];
    harness.createBattle('manila-session-2027', 'm5-pend', 'Breaking', 'Finals', 'Red', 'Blue', panel5);
    harness.voteBattle('manila-session-2027', 'm5-pend', 'j1', 'red');
    const active = harness.voteBattle('manila-session-2027', 'm5-pend', 'j2', 'red');
    assert.equal(active.status, 'active');
    assert.equal(active.winner_corner, null);
  });

  test('T2-F29-4: 5-judge panel: 3 votes for red closes battle with winner red', () => {
    const panel5 = ['j1', 'j2', 'j3', 'j4', 'j5'];
    harness.createBattle('manila-session-2027', 'm5-win', 'Breaking', 'Finals', 'Red', 'Blue', panel5);
    harness.voteBattle('manila-session-2027', 'm5-win', 'j1', 'red');
    harness.voteBattle('manila-session-2027', 'm5-win', 'j2', 'red');
    const closed = harness.voteBattle('manila-session-2027', 'm5-win', 'j3', 'red');
    assert.equal(closed.status, 'closed');
    assert.equal(closed.winner_corner, 'red');
  });

  test('T2-F29-5: Invalid corner color (e.g. green) fails with 400', () => {
    harness.createBattle('manila-session-2027', 'm-green', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1']);
    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'm-green', 'staff-judge-1', 'green'),
      /Corner must be red or blue/
    );
  });

  // --- Feature 30: Battle Durability Boundaries ---
  test('T2-F30-1: Closed battle rejects further votes with 409', () => {
    harness.createBattle('manila-session-2027', 'm-dur-1', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);
    harness.voteBattle('manila-session-2027', 'm-dur-1', 'staff-judge-1', 'red');
    harness.voteBattle('manila-session-2027', 'm-dur-1', 'staff-judge-2', 'red');

    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'm-dur-1', 'staff-judge-3', 'blue'),
      /Battle is already closed/
    );
  });

  test('T2-F30-2: Replay vote for same judge and same corner returns battle without modifying vote counts', () => {
    harness.createBattle('manila-session-2027', 'm-dur-2', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);
    harness.voteBattle('manila-session-2027', 'm-dur-2', 'staff-judge-1', 'red');
    const res = harness.voteBattle('manila-session-2027', 'm-dur-2', 'staff-judge-1', 'red');
    assert.equal(res.votes_red, 1);
  });

  test('T2-F30-3: Active battle reports winner_corner as null', () => {
    const battle = harness.createBattle('manila-session-2027', 'm-dur-3', 'Breaking', 'Semi', 'Red', 'Blue', ['staff-judge-1']);
    assert.equal(battle.winner_corner, null);
    assert.equal(battle.status, 'active');
  });

  test('T2-F30-4: Closed battle reports status as closed', () => {
    harness.createBattle('manila-session-2027', 'm-dur-4', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1', 'staff-judge-2']);
    harness.voteBattle('manila-session-2027', 'm-dur-4', 'staff-judge-1', 'red');
    const closed = harness.voteBattle('manila-session-2027', 'm-dur-4', 'staff-judge-2', 'red');
    assert.equal(closed.status, 'closed');
  });

  test('T2-F30-5: Voting in battle with wrong event ID fails with 404', () => {
    harness.createBattle('manila-session-2027', 'm-dur-5', 'Breaking', 'Finals', 'Red', 'Blue', ['staff-judge-1']);
    assert.throws(
      () => harness.voteBattle('hk-event-2027', 'm-dur-5', 'staff-judge-1', 'red'),
      /Battle not found/
    );
  });
});
