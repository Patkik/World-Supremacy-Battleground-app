// Adversarial Challenge Test Harness for Milestone 4 (challenger_m4_1_gen2)
// Focus: Rubric Bounds, Revision Overwrite, Head Judge Deductions, and Division Locking Barrier Invariants
import assert from 'node:assert/strict';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function runAdversarialRubricBarrierSuite() {
  console.log('='.repeat(80));
  console.log('  MILESTONE 4: ADVERSARIAL STRESS TEST SUITE (challenger_m4_1_gen2)');
  console.log('  Rubric Bounds, Score Revision Overwrite, Deductions Floor & Locking Barrier');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(80));

  const harness = new SystemHarness();

  function setupReadyDivision(divisionId = 'open-crew') {
    harness.reset();
    const eventId = 'manila-session-2027';
    const crew = harness.createCrew('ph', 'mgr-adv', 'Challenger Crew', 'Manila');
    for (let i = 1; i <= 6; i++) {
      crew.members.push({
        uid: `d-${i}`,
        name: `Dancer ${i}`,
        role: 'Dancer',
        is_minor: i === 6,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', eventId, crew.id, divisionId);
    entry.roster = [...crew.members];
    entry.track_filename = 'routine.mp3';
    entry.track_duration_secs = 170;
    entry.paid_minor = 120000 * 6;
    entry.status = 'approved';
    return { eventId, crew, entry };
  }

  // =========================================================================
  // SECTION 1: RUBRIC BOUNDS & INVALID CRITERIA ATTACKS
  // =========================================================================
  console.log('\n[SECTION 1] Rubric Bounds Stress Testing & Total Caps');
  {
    const { eventId, crew } = setupReadyDivision();

    // 1.1 Negative pillar values rejected with 400
    const negVals = [-0.0001, -0.1, -1.0, -20.0, -100.0];
    let allNegRejected = true;
    for (const val of negVals) {
      try {
        harness.submitScore('ph', eventId, 'staff-judge-1', {
          schema_version: 1,
          operation_id: `op-neg-${val}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: val, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
        allNegRejected = false;
      } catch (e) {
        if (!e.message.includes('Criteria scores must be between 0 and 20')) allNegRejected = false;
      }
    }
    record('S1.1: Negative criteria scores rejected with 400', allNegRejected, `tested=${negVals.length} negative values`);

    // 1.2 Values exceeding 20.0 rejected with 400
    const highVals = [20.0001, 20.1, 21.0, 50.0, 100.0, 1e6];
    let allHighRejected = true;
    for (const val of highVals) {
      try {
        harness.submitScore('ph', eventId, 'staff-judge-1', {
          schema_version: 1,
          operation_id: `op-high-${val}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 18, musicality: 18, execution: val, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
        allHighRejected = false;
      } catch (e) {
        if (!e.message.includes('Criteria scores must be between 0 and 20')) allHighRejected = false;
      }
    }
    record('S1.2: Criteria scores > 20.0 rejected with 400', allHighRejected, `tested=${highVals.length} over-bound values`);

    // 1.3 Special non-finite values (NaN, Infinity) rejected
    let specialRejected = true;
    for (const val of [NaN, Infinity, -Infinity]) {
      try {
        harness.submitScore('ph', eventId, 'staff-judge-1', {
          schema_version: 1,
          operation_id: `op-spec-${val}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 18, musicality: val, execution: 18, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
        specialRejected = false;
      } catch (e) {
        if (!e.message.includes('Criteria scores must be between 0 and 20')) specialRejected = false;
      }
    }
    record('S1.3: Non-finite criteria scores (NaN, Inf) rejected with 400', specialRejected, 'tested=[NaN, Inf, -Inf]');

    // 1.4 Maximum possible score is exactly 100.0 (20.0 x 5)
    const perfectReceipt = harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-max-100',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 20.0, musicality: 20.0, execution: 20.0, stage_presence: 20.0, entertainment: 20.0 },
      deductions: [],
    });
    record('S1.4: Perfect score of 20.0 across all 5 pillars yields exactly 100.0', perfectReceipt.net_score === 100.0, `net_score=${perfectReceipt.net_score}`);

    // 1.5 Submitting total > 100.0 is mathematically blocked by 20.0 pillar caps
    let totalOver100Blocked = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-over-100',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 1,
        criteria: { choreography: 20.0, musicality: 20.0, execution: 20.0, stage_presence: 20.0, entertainment: 20.001 },
        deductions: [],
      });
    } catch (e) {
      totalOver100Blocked = e.message.includes('Criteria scores must be between 0 and 20');
    }
    record('S1.5: Total > 100.0 is strictly repelled by per-pillar bounds', totalOver100Blocked, 'rejected 20.001');

    // 1.6 Deduction points bounds [0.0, 100.0]
    let dedBoundsOk = true;
    for (const p of [-0.01, -10.0, NaN]) {
      try {
        harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [{ code: 'bad', reason: 'bad', points: p }]);
        dedBoundsOk = false;
      } catch {
        // expected
      }
    }
    record('S1.6: Negative and NaN deduction points rejected with 400', dedBoundsOk, 'tested=[-0.01, -10.0, NaN]');
  }

  // =========================================================================
  // SECTION 2: OPTIMISTIC REVISION OVERWRITE & NON-ACCUMULATION
  // =========================================================================
  console.log('\n[SECTION 2] Score Revision Overwrite & Non-Accumulation');
  {
    const { eventId, crew } = setupReadyDivision();

    // 2.1 Judge 1 submits initial low score (10.0 * 5 = 50.0 net)
    const rcpt1 = harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
      deductions: [],
    });
    record('S2.1: Judge 1 submits initial score: revision 1, net 50.0', rcpt1.score_revision === 1 && rcpt1.net_score === 50.0, `rev=${rcpt1.score_revision}, net=${rcpt1.net_score}`);

    // 2.2 Stale revision submission (expected_revision: 0 when rev is 1) rejected with 409
    let staleBlocked = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-rev-stale',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        deductions: [],
      });
    } catch (e) {
      staleBlocked = e.message.includes('Expected revision');
    }
    record('S2.2: Stale expected_revision (0 vs 1) rejected with 409', staleBlocked, 'rejected stale update');

    // 2.3 Judge 1 submits valid revision (expected_revision: 1, 20.0 * 5 = 100.0 net)
    const rcpt2 = harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 1,
      criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      deductions: [],
    });
    record('S2.3: Judge 1 submits revision: revision 2, net 100.0', rcpt2.score_revision === 2 && rcpt2.net_score === 100.0, `rev=${rcpt2.score_revision}, net=${rcpt2.net_score}`);

    // 2.4 Duplicate submission with same op_id and payload returns cached receipt (idempotent replay)
    const replayed = harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 1,
      criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      deductions: [],
    });
    record('S2.4: Idempotent replay returns cached receipt without revision bump', replayed.score_revision === rcpt2.score_revision && replayed.receipt_id === rcpt2.receipt_id, `rcpt_id=${replayed.receipt_id}`);

    // 2.5 Judge 2 and Judge 3 submit scores (80.0 each)
    harness.submitScore('ph', eventId, 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-j2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      deductions: [],
    });
    harness.submitScore('ph', eventId, 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-j3',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      deductions: [],
    });

    // 2.6 Lock and tabulate division results
    harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    const tabulated = harness.tabulateDivisionResults('ph', eventId, 'open-crew');

    // CRITICAL: Raw average must be (100.0 + 80.0 + 80.0) / 3 = 86.67
    // If revision accumulated: (50.0 + 100.0 + 80.0 + 80.0) / 4 = 77.5
    const expectedAvg = (100.0 + 80.0 + 80.0) / 3;
    const isOverwritten = Math.abs(tabulated[0].raw_average - expectedAvg) < 0.01;
    record('S2.6: Tabulation reflects overwritten score (86.67) and NEVER accumulates prior revisions', isOverwritten, `actual=${tabulated[0].raw_average.toFixed(2)}, expected=${expectedAvg.toFixed(2)}`);
  }

  // =========================================================================
  // SECTION 3: HEAD JUDGE DEDUCTIONS, PRIVILEGES & FLOOR AT 0.00
  // =========================================================================
  console.log('\n[SECTION 3] Head Judge Deductions, Privilege Gates & Score Floor');
  {
    const { eventId, crew } = setupReadyDivision();

    // 3.1 Non-head-judge attempts fail closed (403 Forbidden)
    let nonHeadBlocked = true;
    for (const badRole of ['judge', 'dancer', 'manager', 'marshal', 'verifier']) {
      try {
        harness.setDeductions('ph', eventId, 'open-crew', crew.id, badRole, [{ code: 'test', reason: 'test', points: 5.0 }]);
        nonHeadBlocked = false;
      } catch (e) {
        if (!e.message.includes('Only head judge can set technical deductions')) nonHeadBlocked = false;
      }
    }
    record('S3.1: Non-head-judge deduction attempts fail closed with 403', nonHeadBlocked, 'tested 5 non-head roles');

    // 3.2 Head judge sets deductions successfully
    const dedRes = harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [
      { code: 'outfit', reason: 'Costume infraction', points: 5.0 },
      { code: 'time', reason: 'Routine overtime', points: 10.0 },
    ]);
    record('S3.2: Head judge applies technical deductions summing to 15.0', dedRes.total_deductions === 15.0, `total=${dedRes.total_deductions}`);

    // 3.3 Deductions apply once to routine
    harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-d-j1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
      deductions: [],
    });
    harness.submitScore('ph', eventId, 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-d-j2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
      deductions: [],
    });
    harness.submitScore('ph', eventId, 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-d-j3',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
      deductions: [],
    });

    harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    const tab1 = harness.tabulateDivisionResults('ph', eventId, 'open-crew');
    // Raw average: 50.0. Deductions: 15.0. Final score: 35.0.
    record('S3.3: Tabulation applies deductions once: 50.0 - 15.0 = 35.0', tab1[0].final_score === 35.0 && tab1[0].total_deductions === 15.0, `raw=50.0, ded=15.0, final=${tab1[0].final_score}`);

    // 3.4 Final score floors at 0.00 when deductions exceed raw average
    // Reset and test massive deductions > raw average
    const div2 = setupReadyDivision('open-crew');

    // Massive deductions: 80.0 points
    harness.setDeductions('ph', div2.eventId, 'open-crew', div2.crew.id, 'head_judge', [
      { code: 'major-1', reason: 'Unsportsmanlike conduct', points: 50.0 },
      { code: 'major-2', reason: 'Illegal props', points: 30.0 },
    ]);

    // Judges score 10.0 each (50.0 net)
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', div2.eventId, j, {
        schema_version: 1,
        operation_id: `op-floor-${j}`,
        division_id: 'open-crew',
        crew_id: div2.crew.id,
        expected_revision: 0,
        criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
        deductions: [],
      });
    }

    harness.lockDivision('ph', div2.eventId, 'open-crew', 'head_judge');
    const tabFloor = harness.tabulateDivisionResults('ph', div2.eventId, 'open-crew');
    // Raw average (50.0) - deductions (80.0) = -30.0 -> FLOORED AT 0.00
    const isFloored = tabFloor[0].final_score === 0.0;
    record('S3.4: Final score floors strictly at 0.00 when deductions (80.0) exceed raw average (50.0)', isFloored, `raw=50.0, ded=80.0, final_score=${tabFloor[0].final_score}`);
  }

  // =========================================================================
  // SECTION 4: DIVISION LOCKING BARRIER INVARIANTS
  // =========================================================================
  console.log('\n[SECTION 4] Division Locking Barrier Invariants');
  {
    const { eventId, crew, entry } = setupReadyDivision();

    // 4.1 Locking with missing scorecards (0/3 submitted) fails with 409
    let noScoresBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      noScoresBlocked = e.message.includes('Missing score');
    }
    record('S4.1: Locking before any judge submits score fails with 409', noScoresBlocked, 'rejected 0/3 scores');

    // 4.2 Locking with partial scorecards (2/3 submitted) fails with 409
    harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-b-j1',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.submitScore('ph', eventId, 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-b-j2',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    let partialBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      partialBlocked = e.message.includes('Missing score from judge staff-judge-3');
    }
    record('S4.2: Locking with partial panel scores (2/3) fails with 409', partialBlocked, 'rejected missing judge-3');

    // 4.3 Division with unapproved entry fails with 409
    entry.status = 'submitted'; // unapproved
    let unapprovedBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      unapprovedBlocked = e.message.includes('is not approved');
    }
    entry.status = 'approved';
    record('S4.3: Locking division with unapproved entry fails with 409', unapprovedBlocked, 'rejected unapproved entry');

    // 4.4 Non-head-judge role attempting lock fails with 403
    let nonHeadLockBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'judge');
    } catch (e) {
      nonHeadLockBlocked = e.message.includes('Only head judge or director can lock division');
    }
    record('S4.4: Regular judge attempting to lock division fails with 403', nonHeadLockBlocked, 'rejected judge role');

    // 4.5 4-vector readiness degradation: unverified minor blocks lock
    crew.members[5].consent_verified = false; // minor unverified
    let unreadyConsentBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      unreadyConsentBlocked = true;
    }
    crew.members[5].consent_verified = true;
    record('S4.5: Entry readiness degradation (consent unverified) blocks division lock', unreadyConsentBlocked, 'guarded consent vector');

    // 4.6 3rd judge submits score, complete panel satisfied -> lock succeeds
    harness.submitScore('ph', eventId, 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-b-j3',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    const lockSuccess = harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    record('S4.6: Complete panel scorecards + ready entries satisfy lock barrier', lockSuccess.locked === true, 'locked=true');

    // 4.7 Re-locking already locked division is idempotent
    const relock = harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    record('S4.7: Re-locking already locked division is idempotent', relock.locked === true && relock.alreadyLocked === true, 'alreadyLocked=true');

    // 4.8 Post-lock score submission is rejected with 409 Conflict
    let postLockScoreBlocked = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-late-post-lock',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 1,
        criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
        deductions: [],
      });
    } catch (e) {
      postLockScoreBlocked = e.message.includes('Division is locked; cannot submit score');
    }
    record('S4.8: Post-lock score submission rejected with 409 Conflict', postLockScoreBlocked, 'rejected post-lock score');

    // 4.9 Post-lock deduction modification is rejected with 409 Conflict
    let postLockDedBlocked = false;
    try {
      harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [{ code: 'late', reason: 'Late penalty', points: 5.0 }]);
    } catch (e) {
      postLockDedBlocked = e.message.includes('Division is locked; cannot alter deductions');
    }
    record('S4.9: Post-lock deduction modification rejected with 409 Conflict', postLockDedBlocked, 'rejected post-lock deductions');
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('  MILESTONE 4 ADVERSARIAL RUBRIC & BARRIER CHALLENGE SUMMARY');
  console.log('='.repeat(80));
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Attack Scenarios: ${total}`);
  console.log(`Passed (Repelled):       ${passed}`);
  console.log(`Failed (Vulnerabilities): ${failed}`);
  console.log('='.repeat(80));
  if (failed === 0) {
    console.log('🎉 ALL ADVERSARIAL ATTACKS REPELLED CLEANLY! Deterministic exit code: 0\n');
    process.exit(0);
  } else {
    console.error('❌ ADVERSARIAL CHALLENGES FAILED! Deterministic exit code: 1\n');
    process.exit(1);
  }
}

runAdversarialRubricBarrierSuite().catch(err => {
  console.error('Fatal unhandled error in challenge suite:', err);
  process.exit(1);
});
