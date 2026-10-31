// Deep Adversarial Challenge Test Harness for Milestone 4 (challenger_m4_re_1)
// Focus: Multi-entry Locking Barrier, Rubric Float Precision, Deduction Deduplication & Tamper Rejection
import assert from 'node:assert/strict';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

async function runEmpiricalDeepDive() {
  console.log('='.repeat(80));
  console.log('  MILESTONE 4: EMPIRICAL ADVERSARIAL DEEP DIVE (challenger_m4_re_1)');
  console.log('='.repeat(80));

  const harness = new SystemHarness();

  // -------------------------------------------------------------------------
  // 1. Extreme float precision on rubric bounds
  // -------------------------------------------------------------------------
  console.log('\n[TEST 1] Extreme float precision & boundary values');
  {
    harness.reset();
    const eventId = 'manila-session-2027';
    const crew = harness.createCrew('ph', 'mgr-1', 'Precision Crew', 'Manila');
    for (let i = 1; i <= 6; i++) {
      crew.members.push({ uid: `d-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', eventId, crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'track.mp3';
    entry.track_duration_secs = 150;
    entry.paid_minor = 120000 * 6;
    entry.status = 'approved';

    // 1.1 Test next float beyond 20.0: 20.000000000000004
    let nextAfter20Rejected = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-prec-1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 20.000000000000004, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        deductions: [],
      });
    } catch (e) {
      nextAfter20Rejected = e.message.includes('Criteria scores must be between 0 and 20');
    }
    record('1.1 Next float above 20.0 (20.000000000000004) is rejected', nextAfter20Rejected, 'rejected over-20 float');

    // 1.2 Test negative float epsilon: -1e-15
    let negEpsilonRejected = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-prec-2',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: -1e-15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        deductions: [],
      });
    } catch (e) {
      negEpsilonRejected = e.message.includes('Criteria scores must be between 0 and 20');
    }
    record('1.2 Negative float epsilon (-1e-15) is rejected', negEpsilonRejected, 'rejected negative float epsilon');

    // 1.3 Test each of the 5 pillars individually with negative score
    const pillars = ['choreography', 'musicality', 'execution', 'stage_presence', 'entertainment'];
    let allPillarsGuarded = true;
    for (const p of pillars) {
      const crit = { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 };
      crit[p] = -0.5;
      try {
        harness.submitScore('ph', eventId, 'staff-judge-1', {
          schema_version: 1,
          operation_id: `op-neg-${p}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: crit,
          deductions: [],
        });
        allPillarsGuarded = false;
      } catch (e) {
        if (!e.message.includes('Criteria scores must be between 0 and 20')) allPillarsGuarded = false;
      }
    }
    record('1.3 Every single pillar rejects negative values individually', allPillarsGuarded, 'all 5 pillars guarded');

    // 1.4 Test zero score (0.0 on all pillars)
    const zeroRcpt = harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-zero-all',
      division_id: 'open-crew',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 0.0, musicality: 0.0, execution: 0.0, stage_presence: 0.0, entertainment: 0.0 },
      deductions: [],
    });
    record('1.4 Zero score on all pillars yields exactly 0.0 net score', zeroRcpt.net_score === 0.0, `net=${zeroRcpt.net_score}`);
  }

  // -------------------------------------------------------------------------
  // 2. Deduction Floor & Deduplication Invariants
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Deductions Floor, Deduplication & Boundary Cases');
  {
    harness.reset();
    const eventId = 'manila-session-2027';
    const crew = harness.createCrew('ph', 'mgr-2', 'Deduction Crew', 'Manila');
    for (let i = 1; i <= 6; i++) {
      crew.members.push({ uid: `d-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', eventId, crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'track.mp3';
    entry.track_duration_secs = 150;
    entry.paid_minor = 120000 * 6;
    entry.status = 'approved';

    // All 3 judges score 10.0 on all pillars -> raw score = 50.0
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', eventId, j, {
        schema_version: 1,
        operation_id: `op-s-${j}`,
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
        deductions: [],
      });
    }

    // 2.1 Deductions exactly equal to raw score (50.0 - 50.0 = 0.0)
    harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [
      { code: 'D1', reason: 'Penalty 1', points: 30.0 },
      { code: 'D2', reason: 'Penalty 2', points: 20.0 },
    ]);
    const tabExact = harness.tabulateDivisionResults('ph', eventId, 'open-crew');
    record('2.1 Deductions exactly equal to raw average yield 0.00 final score', tabExact[0].final_score === 0.0, `final=${tabExact[0].final_score}`);

    // 2.2 Deductions exceeding raw score (50.0 - 100.0 = -50.0 -> floored to 0.00)
    harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [
      { code: 'MAJOR', reason: 'Disqualification level penalty', points: 100.0 },
    ]);
    const tabFloor = harness.tabulateDivisionResults('ph', eventId, 'open-crew');
    record('2.2 Deductions exceeding raw score floor strictly at 0.00', tabFloor[0].final_score === 0.0, `final=${tabFloor[0].final_score}`);

    // 2.3 Fractional deduction: 50.0 - 15.25 = 34.75
    harness.setDeductions('ph', eventId, 'open-crew', crew.id, 'head_judge', [
      { code: 'FRAC', reason: 'Small infraction', points: 15.25 },
    ]);
    const tabFrac = harness.tabulateDivisionResults('ph', eventId, 'open-crew');
    record('2.3 Fractional deduction precision (50.0 - 15.25 = 34.75)', tabFrac[0].final_score === 34.75, `final=${tabFrac[0].final_score}`);
  }

  // -------------------------------------------------------------------------
  // 3. Multi-Entry Locking Barrier Invariants
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Multi-Entry Division Locking Barrier Invariants');
  {
    harness.reset();
    const eventId = 'manila-session-2027';

    // Create Crew A
    const crewA = harness.createCrew('ph', 'mgr-a', 'Crew Alpha', 'Manila');
    for (let i = 1; i <= 6; i++) {
      crewA.members.push({ uid: `da-${i}`, name: `Dancer A${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entryA = harness.createEntryDraft('ph', eventId, crewA.id, 'open-crew');
    entryA.roster = [...crewA.members];
    entryA.track_filename = 'track-a.mp3';
    entryA.track_duration_secs = 160;
    entryA.paid_minor = 120000 * 6;
    entryA.status = 'approved';

    // Create Crew B
    const crewB = harness.createCrew('ph', 'mgr-b', 'Crew Beta', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crewB.members.push({ uid: `db-${i}`, name: `Dancer B${i}`, role: 'Dancer', is_minor: true, consent_verified: true });
    }
    const entryB = harness.createEntryDraft('ph', eventId, crewB.id, 'open-crew');
    entryB.roster = [...crewB.members];
    entryB.track_filename = 'track-b.mp3';
    entryB.track_duration_secs = 150;
    entryB.paid_minor = 120000 * 5;
    entryB.status = 'approved';

    // All 3 judges score Crew A
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', eventId, j, {
        schema_version: 1,
        operation_id: `op-ca-${j}`,
        division_id: 'open-crew',
        crew_id: crewA.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
    }

    // 3.1 Crew A fully scored, but Crew B has 0 scores -> Lock MUST fail!
    let crewBMissingAllBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      crewBMissingAllBlocked = e.message.includes('Missing score from judge');
    }
    record('3.1 Lock fails when Crew B has not been scored by panel', crewBMissingAllBlocked, 'rejected partial entry scores');

    // Only Judge 1 and 2 score Crew B (Judge 3 missing)
    harness.submitScore('ph', eventId, 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-cb-j1',
      division_id: 'open-crew',
      crew_id: crewB.id,
      expected_revision: 0,
      criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
      deductions: [],
    });
    harness.submitScore('ph', eventId, 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-cb-j2',
      division_id: 'open-crew',
      crew_id: crewB.id,
      expected_revision: 0,
      criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
      deductions: [],
    });

    // 3.2 Lock fails when Judge 3 has not scored Crew B
    let judge3MissingCrewBBlocked = false;
    try {
      harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    } catch (e) {
      judge3MissingCrewBBlocked = e.message.includes('staff-judge-3');
    }
    record('3.2 Lock fails when single judge (Judge 3) missing score on Crew B', judge3MissingCrewBBlocked, 'rejected 2/3 scores on Crew B');

    // Judge 3 scores Crew B
    harness.submitScore('ph', eventId, 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-cb-j3',
      division_id: 'open-crew',
      crew_id: crewB.id,
      expected_revision: 0,
      criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
      deductions: [],
    });

    // 3.3 Now all judges scored both crews -> Lock succeeds!
    const lockBoth = harness.lockDivision('ph', eventId, 'open-crew', 'head_judge');
    record('3.3 Multi-entry division locks successfully once complete matrix is present', lockBoth.locked === true, 'both entries complete');

    // 3.4 Post-lock tamper rejection on Crew A
    let postLockCrewABlocked = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-late-a',
        division_id: 'open-crew',
        crew_id: crewA.id,
        expected_revision: 1,
        criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
        deductions: [],
      });
    } catch (e) {
      postLockCrewABlocked = e.message.includes('Division is locked');
    }
    record('3.4 Post-lock score on Crew A is rejected with 409 Conflict', postLockCrewABlocked, 'blocked late score');

    // 3.5 Post-lock tamper rejection on Crew B
    let postLockCrewBBlocked = false;
    try {
      harness.submitScore('ph', eventId, 'staff-judge-2', {
        schema_version: 1,
        operation_id: 'op-late-b',
        division_id: 'open-crew',
        crew_id: crewB.id,
        expected_revision: 1,
        criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
        deductions: [],
      });
    } catch (e) {
      postLockCrewBBlocked = e.message.includes('Division is locked');
    }
    record('3.5 Post-lock score on Crew B is rejected with 409 Conflict', postLockCrewBBlocked, 'blocked late score');

    // 3.6 Post-lock deduction tampering on Crew A is rejected
    let postLockDedBlocked = false;
    try {
      harness.setDeductions('ph', eventId, 'open-crew', crewA.id, 'head_judge', [{ code: 'late', reason: 'Late', points: 10 }]);
    } catch (e) {
      postLockDedBlocked = e.message.includes('Division is locked');
    }
    record('3.6 Post-lock deduction alteration is rejected with 409 Conflict', postLockDedBlocked, 'blocked late deduction');
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n' + '='.repeat(80));
  console.log('  EMPIRICAL DEEP DIVE SUMMARY');
  console.log('='.repeat(80));
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Total Scenarios: ${total}`);
  console.log(`Passed:          ${passed}`);
  console.log(`Failed:          ${failed}`);
  console.log('='.repeat(80));
  if (failed === 0) {
    console.log('🎉 ALL EMPIRICAL DEEP DIVE ATTACKS REPELLED! Exit code: 0\n');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED! Exit code: 1\n');
    process.exit(1);
  }
}

runEmpiricalDeepDive().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
