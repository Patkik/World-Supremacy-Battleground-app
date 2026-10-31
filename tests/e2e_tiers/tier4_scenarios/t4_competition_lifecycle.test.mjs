import test from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

test.describe('Tier 4: Real-World Scenarios - Competition Lifecycle', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  // T4-01: End-to-End Championship Lifecycle (Full Pipeline)
  test('T4-01: Complete Championship Lifecycle: Registration to signed publication and HUD projection', () => {
    // 1. Crew Creation & Dancer Recruitment
    const crew = harness.createCrew('ph', 'mgr-e2e', 'Golden Dynasty', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-gd-${i}`,
        name: `GD Dancer ${i}`,
        dob: '2002-05-10',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }

    // 2. Entry Creation
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // 3. Audio Upload
    const audioRes = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'golden_mix.mp3', 150);
    assert.equal(audioRes.compliant, true);

    // 4. Split Payment & Reconciliation (5 dancers * 120,000 = 600,000)
    const payReq = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-gd-0', 'ref-e2e-pay', 600000);
    harness.reconcilePayment('ph', payReq.payment_id, 'finance', true);

    // 5. 4-Vector Readiness Check
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.is_ready, true);
    assert.equal(readiness.roster_ready, true);
    assert.equal(readiness.music_ready, true);
    assert.equal(readiness.consent_ready, true);
    assert.equal(readiness.payment_ready, true);

    // 6. Submission & Director Review
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // 7. DJ Playlist Export
    const playlist = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(playlist.total_tracks, 1);
    assert.equal(playlist.manifest[0].crew_name, 'Golden Dynasty');

    // 8. Venue Check-In & Stage Marshal Queuing
    harness.checkInDancer('ph', 'manila-session-2027', 'dancer-gd-0', 'marshal');
    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');

    // 9. Judge Panel Scoring (3 judges)
    const judges = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];
    for (let idx = 0; idx < judges.length; idx++) {
      harness.submitScore('ph', 'manila-session-2027', judges[idx], {
        schema_version: 1,
        operation_id: `op-gd-${idx}`,
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: {
          choreography: 18,
          musicality: 18,
          execution: 18,
          stage_presence: 18,
          entertainment: 18, // Total: 90
        },
      });
    }

    // 10. Head Judge Deduction (0.5 point minor floor violation)
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [
      { reason: 'Boundary line fault', points: 0.5 },
    ]);

    // 11. Division Lock Barrier
    const lockResult = harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    assert.equal(lockResult.locked, true);

    // 12. Tabulation
    const tabulated = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(tabulated.length, 1);
    assert.equal(tabulated[0].raw_average, 90);
    assert.equal(tabulated[0].total_deductions, 0.5);
    assert.equal(tabulated[0].final_score, 89.5);
    assert.equal(tabulated[0].rank, 1);

    // 13. Immutable Signed Publication
    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.ok(snapshot.publication_id);
    assert.equal(snapshot.digest.length, 64);

    // 14. Public Results & Arena Broadcast HUD Projection
    const publicResults = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.equal(publicResults.standings[0].crew_name, 'Golden Dynasty');
    assert.equal(publicResults.standings[0].final_score, 89.5);
    assert.equal(publicResults.standings[0].rank, 1);
  });

  // T4-02: Multi-Crew Championship Division Lifecycle
  test('T4-02: Multi-Crew Division: 3 competing crews with accurate rank ordering and signed digest', () => {
    const crewData = [
      { name: 'Dynasty Alpha', score: 19, deduction: 0 },    // net 95.0, rank 1
      { name: 'Dynasty Beta', score: 17, deduction: 1.0 },   // net 84.0, rank 2
      { name: 'Dynasty Gamma', score: 15, deduction: 0.5 },  // net 74.5, rank 3
    ];

    const entries = [];
    for (const cd of crewData) {
      const crew = harness.createCrew('ph', `mgr-${cd.name}`, cd.name, 'Manila');
      for (let i = 0; i < 5; i++) {
        crew.members.push({
          uid: `dancer-${cd.name}-${i}`,
          name: `Dancer ${i}`,
          dob: '2001-01-01',
          role: 'Dancer',
          is_minor: false,
          consent_verified: true,
        });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'track.mp3', 120);
      const pay = harness.requestPayment('ph', 'manila-session-2027', entry.id, `dancer-${cd.name}-0`, `ref-${cd.name}`, 600000);
      harness.reconcilePayment('ph', pay.payment_id, 'finance', true);
      harness.submitEntry('ph', 'manila-session-2027', entry.id);
      harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);
      entries.push({ entry, crew, cd });
    }

    // Score all crews across all 3 judges
    const judges = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];
    for (const { entry, crew, cd } of entries) {
      for (let jIdx = 0; jIdx < judges.length; jIdx++) {
        harness.submitScore('ph', 'manila-session-2027', judges[jIdx], {
          schema_version: 1,
          operation_id: `op-mc-${crew.id}-${jIdx}`,
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: {
            choreography: cd.score,
            musicality: cd.score,
            execution: cd.score,
            stage_presence: cd.score,
            entertainment: cd.score,
          },
        });
      }
      if (cd.deduction > 0) {
        harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [
          { reason: 'Penalty', points: cd.deduction },
        ]);
      }
    }

    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    assert.equal(pub.results.length, 3);
    assert.equal(pub.results[0].rank, 1);
    assert.equal(pub.results[0].final_score, 95);
    assert.equal(pub.results[1].rank, 2);
    assert.equal(pub.results[1].final_score, 84);
    assert.equal(pub.results[2].rank, 3);
    assert.equal(pub.results[2].final_score, 74.5);
  });

  // T4-03: Minor Consent Gated Progression
  test('T4-03: Minor Consent Progression: Guardian consent required before entry submission and approval', () => {
    const crew = harness.createCrew('ph', 'mgr-junior', 'Junior Squad', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `junior-dancer-${i}`,
        name: `Junior Dancer ${i}`,
        dob: '2012-04-15', // Minor (<18)
        role: 'Dancer',
        is_minor: true,
        consent_verified: false,
      });
    }

    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const pay = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'junior-dancer-0', 'ref-jr', 600000);
    harness.reconcilePayment('ph', pay.payment_id, 'finance', true);

    // Readiness initially fails due to missing consent
    let readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.consent_ready, false);
    assert.equal(readiness.is_ready, false);

    // Submission yields needs_correction due to missing consent
    const subRes = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(subRes.entry.status, 'needs_correction');
    assert.equal(subRes.readiness.consent_ready, false);

    // Approval blocked while unverified
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true),
      err => err.status === 400
    );

    // Guardian submits consent for each minor dancer
    for (let i = 0; i < 5; i++) {
      harness.submitGuardianConsent('ph', crew.id, `junior-dancer-${i}`, `Parent of ${i}`, '2027-02-01');
    }

    readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.consent_ready, true);
    assert.equal(readiness.is_ready, true);

    // Submission & review now succeed
    const submitted = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(submitted.entry.status, 'submitted');
    const approved = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);
    assert.equal(approved.status, 'approved');
  });

  // T4-04: Multi-Stage Marshal Flow with Venue Passes
  test('T4-04: Stage Marshal Flow: Sequential movement through backstage checkpoints', () => {
    const crew = harness.createCrew('ph', 'mgr-flow', 'Flow Masters', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-flow-${i}`,
        name: `Flow Dancer ${i}`,
        dob: '2000-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-flow-0', 'ref-f', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Check in dancer
    const pass = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-flow-0', 'marshal');
    assert.ok(pass.pass_id);

    // Queue progression: holding -> on_deck -> stage
    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'holding');
    let queue = harness.getStageQueue('manila-session-2027');
    assert.equal(queue.find(q => q.entry_id === entry.id).status, 'holding');

    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'on_deck');
    queue = harness.getStageQueue('manila-session-2027');
    assert.equal(queue.find(q => q.entry_id === entry.id).status, 'on_deck');

    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');
    queue = harness.getStageQueue('manila-session-2027');
    assert.equal(queue.find(q => q.entry_id === entry.id).status, 'stage');
  });

  // T4-05: Tied Championship Resolution Workflow
  test('T4-05: Tied Championship Resolution: Tied scores gate publication until tie policy flag approved', () => {
    const crewA = harness.createCrew('ph', 'mgr-tie-a', 'Tie Crew Alpha', 'Manila');
    const crewB = harness.createCrew('ph', 'mgr-tie-b', 'Tie Crew Beta', 'Manila');

    for (const c of [crewA, crewB]) {
      for (let i = 0; i < 5; i++) {
        c.members.push({
          uid: `dancer-${c.id}-${i}`,
          name: `Dancer ${i}`,
          dob: '2000-01-01',
          role: 'Dancer',
          is_minor: false,
          consent_verified: true,
        });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', c.id, 'open-crew');
      harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
      const pay = harness.requestPayment('ph', 'manila-session-2027', entry.id, `dancer-${c.id}-0`, `ref-${c.id}`, 600000);
      harness.reconcilePayment('ph', pay.payment_id, 'finance', true);
      harness.submitEntry('ph', 'manila-session-2027', entry.id);
      harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

      // Score both crews identically (90 points from each judge)
      for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
        harness.submitScore('ph', 'manila-session-2027', j, {
          schema_version: 1,
          operation_id: `op-tie-${c.id}-${j}`,
          division_id: 'open-crew',
          crew_id: c.id,
          expected_revision: 0,
          criteria: {
            choreography: 18,
            musicality: 18,
            execution: 18,
            stage_presence: 18,
            entertainment: 18,
          },
        });
      }
    }

    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    // Default publication attempt fails due to unresolved tie
    assert.throws(
      () => harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false),
      err => err.status === 409
    );

    // Overriding with allowTies = true publishes verified shared rank
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', true);
    assert.equal(pub.results[0].rank, 1);
    assert.equal(pub.results[1].rank, 1);
    assert.equal(pub.results[0].final_score, pub.results[1].final_score);
  });

  // T4-06: Multi-Division Event Lifecycle
  test('T4-06: Multi-Division Lifecycle: Concurrent divisions maintain isolated lock and score domains', () => {
    // Add second division to event
    harness.divisions.set('manila-session-2027:monster-crew', {
      id: 'monster-crew',
      name: 'Monster Crew Division',
      min_members: 10,
      max_members: 40,
      max_duration_secs: 240,
      max_age: null,
      fee_minor: 150000,
    });
    harness.judgePanels.set('manila-session-2027:monster-crew', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);

    // Setup Open Crew Entry
    const crewOpen = harness.createCrew('ph', 'mgr-open', 'Open Crew Div', 'Manila');
    for (let i = 0; i < 5; i++) {
      crewOpen.members.push({ uid: `d-o-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entryOpen = harness.createEntryDraft('ph', 'manila-session-2027', crewOpen.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entryOpen.id, 'open.mp3', 120);
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entryOpen.id, 'd-o-0', 'ref-o', 600000);
    harness.reconcilePayment('ph', p1.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entryOpen.id);
    harness.reviewEntry('ph', 'manila-session-2027', entryOpen.id, 'chapter_director', true);

    // Score and lock open crew division only
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-o-${j}`,
        division_id: 'open-crew',
        crew_id: crewOpen.id,
        expected_revision: 0,
        criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      });
    }
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    // Open crew is locked; monster crew remains unlocked and untouched
    assert.equal(harness.divisionLocks.get('manila-session-2027:open-crew'), true);
    assert.equal(harness.divisionLocks.get('manila-session-2027:monster-crew'), undefined);
  });

  // T4-07: Chapter Financial Audit Cycle
  test('T4-07: Chapter Financial Audit: Settlement, refund, and ledger summary integrity', () => {
    const crew = harness.createCrew('ph', 'mgr-fin-audit', 'Audit Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-aud-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // Make 2 payments
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-aud-0', 'ref-p1', 300000);
    harness.reconcilePayment('ph', p1.payment_id, 'finance', true);

    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-aud-1', 'ref-p2', 300000);
    harness.reconcilePayment('ph', p2.payment_id, 'finance', true);

    // Refund p2
    harness.refundPayment('ph', p2.payment_id, 'finance');

    const summary = harness.getFinanceSummary('ph');
    assert.equal(summary.chapter_id, 'ph');
    assert.equal(summary.total_settled_minor, 300000);
    assert.equal(summary.total_refunded_minor, 300000);
    assert.equal(summary.transaction_count, 2);
  });

  // T4-08: BG.ONE Tournament Bracket Progression
  test('T4-08: BG.ONE Tournament Bracket: Single elimination round progression with majority ballots', () => {
    // Semi-Final Match
    const match = harness.createBattle(
      'manila-session-2027',
      'semi-1',
      '1v1_breaking',
      'semifinals',
      'BBoy Vortex',
      'BBoy Zenith',
      ['judge-b1', 'judge-b2', 'judge-b3']
    );

    harness.voteBattle('manila-session-2027', 'semi-1', 'judge-b1', 'red');
    harness.voteBattle('manila-session-2027', 'semi-1', 'judge-b2', 'red');

    const semiResult = harness.getBattle('manila-session-2027', 'semi-1');
    assert.equal(semiResult.status, 'closed');
    assert.equal(semiResult.winner_corner, 'red');

    // Winner advances to Final Match
    const finalMatch = harness.createBattle(
      'manila-session-2027',
      'final-1',
      '1v1_breaking',
      'finals',
      semiResult.red_corner_name, // BBoy Vortex
      'BBoy Cipher',
      ['judge-b1', 'judge-b2', 'judge-b3']
    );

    harness.voteBattle('manila-session-2027', 'final-1', 'judge-b1', 'red');
    harness.voteBattle('manila-session-2027', 'final-1', 'judge-b2', 'blue');
    harness.voteBattle('manila-session-2027', 'final-1', 'judge-b3', 'red');

    const championMatch = harness.getBattle('manila-session-2027', 'final-1');
    assert.equal(championMatch.status, 'closed');
    assert.equal(championMatch.winner_corner, 'red');
    assert.equal(championMatch.red_corner_name, 'BBoy Vortex');
  });

  // T4-09: Stage Disqualification & Zero Floor Protection
  test('T4-09: Penalty Flooring Protection: Disqualification penalty does not produce negative score', () => {
    const crew = harness.createCrew('ph', 'mgr-dq', 'Heavy Penalty Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-dq-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-dq-0', 'ref-dq', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-dq-${j}`,
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 2, musicality: 2, execution: 2, stage_presence: 2, entertainment: 2 }, // Total: 10
      });
    }

    // Heavy penalty: 50 points deduction
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [
      { reason: 'Major stage infraction', points: 50 },
    ]);

    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    assert.equal(pub.results[0].raw_average, 10);
    assert.equal(pub.results[0].total_deductions, 50);
    assert.equal(pub.results[0].final_score, 0); // Strict floor at 0
  });

  // T4-10: Multi-Chapter Parallel Championship
  test('T4-10: Multi-Chapter Isolation: Simultaneous events in separate chapters remain strictly partitioned', () => {
    // Chapter PH (seeded) vs Chapter AU
    harness.events.set('syd-session-2027', {
      id: 'syd-session-2027',
      chapter_id: 'au',
      name: 'Sydney Session 2027',
      status: 'active',
      rules_version: '2027.1',
      registration_closes_at: Math.floor(Date.now() / 1000) + 86400 * 30,
    });
    harness.divisions.set('syd-session-2027:open-crew', {
      id: 'open-crew',
      name: 'Open Division',
      min_members: 5,
      max_members: 20,
      max_duration_secs: 180,
      fee_minor: 3500, // AUD
    });

    const crewPh = harness.createCrew('ph', 'mgr-ph', 'Manila Monarchs', 'Manila');
    const crewAu = harness.createCrew('au', 'mgr-au', 'Sydney Sovereigns', 'Sydney');

    assert.equal(crewPh.chapter_id, 'ph');
    assert.equal(crewAu.chapter_id, 'au');

    // Cross-chapter entry attempt fails
    assert.throws(
      () => harness.createEntryDraft('au', 'manila-session-2027', crewAu.id, 'open-crew'),
      err => err.status === 404
    );
  });

  // T4-11: Registration Window Deadline Enforcement
  test('T4-11: Registration Window Enforcement: Submissions permitted before deadline, rejected after', () => {
    const crew = harness.createCrew('ph', 'mgr-window', 'Deadline Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-win-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-win-0', 'ref-win', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);

    // Active event allows submission
    const submitted = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(submitted.entry.status, 'submitted');

    // Simulate expired event registration
    const ev = harness.getEvent('ph', 'manila-session-2027');
    ev.registration_closes_at = Math.floor(Date.now() / 1000) - 3600; // 1 hr ago

    const lateCrew = harness.createCrew('ph', 'mgr-late', 'Late Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      lateCrew.members.push({ uid: `d-lt-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const lateEntry = harness.createEntryDraft('ph', 'manila-session-2027', lateCrew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', lateEntry.id, 'mix.mp3', 120);
    const pLate = harness.requestPayment('ph', 'manila-session-2027', lateEntry.id, 'd-lt-0', 'ref-lt', 600000);
    harness.reconcilePayment('ph', pLate.payment_id, 'finance', true);

    // Submission after deadline rejected
    assert.throws(
      () => harness.submitEntry('ph', 'manila-session-2027', lateEntry.id),
      err => err.status === 400
    );
  });

  // T4-12: Complete Venue Production & Arena Display Workflow
  test('T4-12: Venue Production Workflow: Marshal queue synchronization with public arena display', () => {
    const crew = harness.createCrew('ph', 'mgr-prod', 'Production Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({ uid: `d-pr-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-pr-0', 'ref-pr', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    harness.checkInDancer('ph', 'manila-session-2027', 'd-pr-0', 'marshal');
    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');

    const queue = harness.getStageQueue('manila-session-2027');
    const onStage = queue.find(q => q.status === 'stage');
    assert.equal(onStage.entry_id, entry.id);

    // Brand and accessibility verification for broadcast HUD
    const brandMark = harness.validateBrandMark('<svg viewBox="0 0 100 100"><rect fill="#ffffff" width="100" height="100"/></svg>');
    assert.equal(brandMark.compliant, true);
  });
});
