import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 3: Cross-Feature Interactions - Judging & Publication', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupCompetitionDivision() {
    const crew1 = harness.createCrew('ph', 'mgr-c1', 'Alpha Crew', 'Manila');
    const crew2 = harness.createCrew('ph', 'mgr-c2', 'Beta Crew', 'Cebu');
    for (let i = 1; i <= 5; i++) {
      crew1.members.push({ uid: `c1-${i}`, name: `C1 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      crew2.members.push({ uid: `c2-${i}`, name: `C2 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const e1 = harness.createEntryDraft('ph', 'manila-session-2027', crew1.id, 'open-crew');
    const e2 = harness.createEntryDraft('ph', 'manila-session-2027', crew2.id, 'open-crew');
    e1.status = 'approved';
    e2.status = 'approved';

    return { crew1, crew2, e1, e2 };
  }

  test('T3-16: F13 Approved Entry + F27 Judge Lineup: Only approved entries appear in judge lineup', () => {
    const { crew1 } = setupCompetitionDivision();
    // Create draft unapproved entry
    const crewDraft = harness.createCrew('ph', 'mgr-draft', 'Draft Crew', 'Manila');
    harness.createEntryDraft('ph', 'manila-session-2027', crewDraft.id, 'open-crew'); // status is draft

    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.ok(lineup.items.some(i => i.crew_id === crew1.id));
    assert.ok(!lineup.items.some(i => i.crew_id === crewDraft.id));
  });

  test('T3-17: F24 Judge Scoring + F27 Lineup Completion: Scorecard submission updates completed flag', () => {
    const { crew1, e1 } = setupCompetitionDivision();
    const lineupBefore = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.equal(lineupBefore.items.find(i => i.entry_id === e1.id).completed, false);

    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-lineup-comp',
      division_id: 'open-crew',
      crew_id: crew1.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });

    const lineupAfter = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.equal(lineupAfter.items.find(i => i.entry_id === e1.id).completed, true);
  });

  test('T3-18: F24 Panel Scoring + F25 Deductions: 5-pillar rubric combined with penalty points', () => {
    const { crew1 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-p-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
        deductions: [],
      });
    }
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'late', reason: 'Late start', points: 3.0 }]);

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const r = results.find(i => i.crew_id === crew1.id);
    assert.equal(r.raw_average, 95.0);
    assert.equal(r.total_deductions, 3.0);
    assert.equal(r.final_score, 92.0);
  });

  test('T3-19: F24 Panel Scoring + F26 Lock Barrier: Complete panel scoring satisfies barrier', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const crew of [crew1, crew2]) {
      for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
        harness.submitScore('ph', 'manila-session-2027', j, {
          schema_version: 1,
          operation_id: `op-lock-${crew.id}-${j}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
      }
    }
    const lock = harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    assert.equal(lock.locked, true);
  });

  test('T3-20: F26 Division Lock + F24 Score Submission: Lock seals scorecards against late submissions', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const crew of [crew1, crew2]) {
      for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
        harness.submitScore('ph', 'manila-session-2027', j, {
          schema_version: 1,
          operation_id: `op-seal-${crew.id}-${j}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
      }
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-late',
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 1,
        criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
        deductions: [],
      }),
      /Division is locked; cannot submit score/
    );
  });

  test('T3-21: F26 Division Lock + F25 Deductions: Lock seals technical deductions against modification', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const crew of [crew1, crew2]) {
      for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
        harness.submitScore('ph', 'manila-session-2027', j, {
          schema_version: 1,
          operation_id: `op-dseal-${crew.id}-${j}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
          deductions: [],
        });
      }
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'late', reason: 'Late', points: 1 }]),
      /Division is locked; cannot alter deductions/
    );
  });

  test('T3-22: F26 Division Lock + F31 Tabulation: Tabulation aggregates locked panel results', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-t1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-t2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].crew_id, crew1.id);
    assert.equal(results[0].final_score, 100);
    assert.equal(results[0].rank, 1);
    assert.equal(results[1].crew_id, crew2.id);
    assert.equal(results[1].final_score, 90);
    assert.equal(results[1].rank, 2);
  });

  test('T3-23: F31 Tabulation + F32 Immutable Publication: Tabulated results exported into signed snapshot', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-pub1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-pub2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
        deductions: [],
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(snapshot.results.length, 2);
    assert.equal(snapshot.digest.length, 64);
  });

  test('T3-24: F32 Immutable Publication + F33 Public Results Projection: Clean public standings', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-proj1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-proj2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
        deductions: [],
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.equal(proj.standings[0].crew_name, 'Alpha Crew');
    assert.equal(proj.standings[0].rank, 1);
  });

  test('T3-25: F32 Publication + F34 Arena Broadcast HUD: Published snapshot updates live arena HUD', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-hud1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-hud2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
        deductions: [],
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.equal(hud.standings.length, 2);
    assert.equal(hud.standings[0].final_score, 90);
  });

  test('T3-26: F31 Tied Tabulation + F32 Unverified Tie Policy Gate: Tied ranks block publication', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-tie1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-tie2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false),
      /Unresolved ties exist/
    );

    // Now publish with tie flag approved
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', true);
    assert.equal(pub.results[0].rank, 1);
    assert.equal(pub.results[1].rank, 1);
  });

  test('T3-27: F24 Multiple Judge Revisions + F31 Tabulation: Revised scores update tabulated average', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    // Judge 1 submits initial 80
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-init',
      division_id: 'open-crew',
      crew_id: crew1.id,
      expected_revision: 0,
      criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      deductions: [],
    });
    // Judge 1 revises to 90
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rev-final',
      division_id: 'open-crew',
      crew_id: crew1.id,
      expected_revision: 1,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    // Judges 2 and 3 submit 90
    for (const j of ['staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-j-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
    }

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results.find(r => r.crew_id === crew1.id).raw_average, 90.0);
  });

  test('T3-28: F25 Large Deductions + F31 Floor at 0.0: Floor zero prevents negative final score', () => {
    const { crew1 } = setupCompetitionDivision();
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-floor-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
        deductions: [],
      });
    }
    // Average is 50.0; apply 70.0 deduction
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'disq', reason: 'Disqualified', points: 70.0 }]);

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].final_score, 0.0);
  });

  test('T3-29: F24 Score Submission + F28 Offline Outbox Reconnect: Replay returns valid receipt', async () => {
    const { crew1 } = setupCompetitionDivision();
    const store = harness.createOutboxStore();
    const cmd = {
      schema_version: 1,
      operation_id: 'op-outbox-replay',
      division_id: 'open-crew',
      crew_id: crew1.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    };
    await store.put({ key: cmd.operation_id, owner: 'staff-judge-1', command: cmd, state: 'queued' });

    // Simulate reconnection & flush
    const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
    await store.put({ key: cmd.operation_id, owner: 'staff-judge-1', command: cmd, state: 'acknowledged', receipt });

    const listed = await store.list('staff-judge-1');
    assert.equal(listed[0].state, 'acknowledged');
    assert.equal(listed[0].receipt.net_score, 90.0);
  });

  test('T3-30: F27 Lineup Pagination + F26 Lock Barrier: Multi-entry division verifies complete scoring', () => {
    const { crew1, crew2 } = setupCompetitionDivision();
    // c1 is scored, c2 is partially scored
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-c1-j1',
      division_id: 'open-crew',
      crew_id: crew1.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    // Check lineup reports c1 completed, c2 incomplete
    const lineup = harness.getJudgeLineup('ph', 'manila-session-2027', 'staff-judge-1');
    assert.equal(lineup.items.find(i => i.crew_id === crew1.id).completed, true);
    assert.equal(lineup.items.find(i => i.crew_id === crew2.id).completed, false);

    assert.throws(
      () => harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge'),
      /Missing score/
    );
  });
});
