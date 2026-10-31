import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 2: Boundary & Corner Cases (F31 - F40)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupCompletedDivision() {
    const crew1 = harness.createCrew('ph', 'mgr-t2-pub1', 'Pub Crew 1', 'Manila');
    const crew2 = harness.createCrew('ph', 'mgr-t2-pub2', 'Pub Crew 2', 'Quezon City');
    for (let i = 1; i <= 5; i++) {
      crew1.members.push({ uid: `p1-${i}`, name: `P1 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      crew2.members.push({ uid: `p2-${i}`, name: `P2 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const e1 = harness.createEntryDraft('ph', 'manila-session-2027', crew1.id, 'open-crew');
    const e2 = harness.createEntryDraft('ph', 'manila-session-2027', crew2.id, 'open-crew');
    e1.status = 'approved';
    e2.status = 'approved';

    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c1-${j}`,
        division_id: 'open-crew',
        crew_id: crew1.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c2-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 0,
        criteria: { choreography: 17, musicality: 17, execution: 17, stage_presence: 17, entertainment: 17 },
        deductions: [],
      });
    }

    return { crew1, crew2, e1, e2 };
  }

  // --- Feature 31: Tabulation Boundaries ---
  test('T2-F31-1: Deductions exceeding raw score yield 0.0 final score (never negative)', () => {
    const { crew1 } = setupCompletedDivision();
    // Raw average is 90; apply 120 deduction
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'severe', reason: 'Extreme', points: 120.0 }]);
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const r1 = results.find(r => r.crew_id === crew1.id);
    assert.equal(r1.final_score, 0.0);
  });

  test('T2-F31-2: Single crew in division is tabulated with rank 1', () => {
    const crew = harness.createCrew('ph', 'mgr-solo', 'Solo Tab Crew', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    harness.divisions.set('manila-session-2027:solo-div', { id: 'solo-div', name: 'Solo Div', min_members: 1, max_members: 5, max_duration_secs: 180, fee_minor: 100000 });
    harness.judgePanels.set('manila-session-2027:solo-div', ['staff-judge-1']);
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'solo-div');
    entry.status = 'approved';

    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-solo',
      division_id: 'solo-div',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 19, musicality: 19, execution: 19, stage_presence: 19, entertainment: 19 },
      deductions: [],
    });

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'solo-div');
    assert.equal(results.length, 1);
    assert.equal(results[0].rank, 1);
  });

  test('T2-F31-3: 3-way tie assigns rank 1 to all three and rank 4 to next crew', () => {
    const { crew1, crew2 } = setupCompletedDivision();
    // Add crew 3 and crew 4
    const crew3 = harness.createCrew('ph', 'mgr-c3', 'Crew 3', 'Manila');
    const crew4 = harness.createCrew('ph', 'mgr-c4', 'Crew 4', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew3.members.push({ uid: `c3-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      crew4.members.push({ uid: `c4-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const e3 = harness.createEntryDraft('ph', 'manila-session-2027', crew3.id, 'open-crew');
    const e4 = harness.createEntryDraft('ph', 'manila-session-2027', crew4.id, 'open-crew');
    e3.status = 'approved';
    e4.status = 'approved';

    // c1, c2, c3 score 90.0, c4 scores 80.0
    for (const j of ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']) {
      // c2 was 85; submit revision 1 to make it 90
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c2-rev-${j}`,
        division_id: 'open-crew',
        crew_id: crew2.id,
        expected_revision: 1,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c3-${j}`,
        division_id: 'open-crew',
        crew_id: crew3.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
        deductions: [],
      });
      harness.submitScore('ph', 'manila-session-2027', j, {
        schema_version: 1,
        operation_id: `op-c4-${j}`,
        division_id: 'open-crew',
        crew_id: crew4.id,
        expected_revision: 0,
        criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
        deductions: [],
      });
    }

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].rank, 1);
    assert.equal(results[1].rank, 1);
    assert.equal(results[2].rank, 1);
    assert.equal(results[3].rank, 4);
  });

  test('T2-F31-4: Raw average with repeating decimals is rounded to 2 decimal places', () => {
    const crew = harness.createCrew('ph', 'mgr-repeat', 'Repeat Crew', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `r-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    harness.divisions.set('manila-session-2027:rep-div', { id: 'rep-div', name: 'Rep Div', min_members: 1, max_members: 5, max_duration_secs: 180, fee_minor: 100000 });
    harness.judgePanels.set('manila-session-2027:rep-div', ['staff-judge-1', 'staff-judge-2', 'staff-judge-3']);
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'rep-div');
    entry.status = 'approved';

    // 90 + 91 + 91 = 272 / 3 = 90.6666...
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-rep-1',
      division_id: 'rep-div',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      deductions: [],
    });
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-2', {
      schema_version: 1,
      operation_id: 'op-rep-2',
      division_id: 'rep-div',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18.2, musicality: 18.2, execution: 18.2, stage_presence: 18.2, entertainment: 18.2 },
      deductions: [],
    });
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-3', {
      schema_version: 1,
      operation_id: 'op-rep-3',
      division_id: 'rep-div',
      crew_id: crew.id,
      expected_revision: 0,
      criteria: { choreography: 18.2, musicality: 18.2, execution: 18.2, stage_presence: 18.2, entertainment: 18.2 },
      deductions: [],
    });

    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'rep-div');
    assert.equal(results[0].raw_average, 90.67);
  });

  test('T2-F31-5: Division with 0 entries tabulates empty results array', () => {
    harness.divisions.set('manila-session-2027:zero-div', { id: 'zero-div', name: 'Zero Div', min_members: 1, max_members: 5, max_duration_secs: 180, fee_minor: 100000 });
    harness.judgePanels.set('manila-session-2027:zero-div', ['staff-judge-1']);
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'zero-div');
    assert.equal(results.length, 0);
  });

  // --- Feature 32: Publication Boundaries ---
  test('T2-F32-1: Re-publishing division returns identical SHA-256 digest', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub1 = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const pub2 = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(pub1.digest, pub2.digest);
  });

  test('T2-F32-2: Publication snapshot published_at is a valid Unix epoch timestamp', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.ok(pub.published_at > 1700000000);
  });

  test('T2-F32-3: Modifying results payload completely alters SHA-256 digest', () => {
    const data1 = JSON.stringify([{ crew_id: 'c1', final_score: 90, rank: 1 }]);
    const data2 = JSON.stringify([{ crew_id: 'c1', final_score: 90.1, rank: 1 }]);
    const d1 = crypto.createHash('sha256').update(data1).digest('hex');
    const d2 = crypto.createHash('sha256').update(data2).digest('hex');
    assert.notEqual(d1, d2);
  });

  test('T2-F32-4: Publishing tied results without approval flag fails with 409', () => {
    const { crew1 } = setupCompletedDivision();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 't', reason: 'Tie', points: 5.0 }]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false),
      /Unresolved ties exist/
    );
  });

  test('T2-F32-5: Publishing with tie approval flag true publishes tied standings', () => {
    const { crew1 } = setupCompletedDivision();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 't', reason: 'Tie', points: 5.0 }]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', true);
    assert.equal(pub.results[0].rank, pub.results[1].rank);
  });

  // --- Feature 33: Public Projection Boundaries ---
  test('T2-F33-1: Two published divisions in same event maintain distinct projections', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    // Create and publish monster division
    const cMonster = harness.createCrew('ph', 'mgr-mon', 'Monster Crew', 'Manila');
    for (let i = 1; i <= 5; i++) cMonster.members.push({ uid: `m-${i}`, name: `M ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    harness.divisions.set('manila-session-2027:monster', { id: 'monster', name: 'Monster', min_members: 1, max_members: 5, max_duration_secs: 180, fee_minor: 100000 });
    harness.judgePanels.set('manila-session-2027:monster', ['staff-judge-1']);
    const eMon = harness.createEntryDraft('ph', 'manila-session-2027', cMonster.id, 'monster');
    eMon.status = 'approved';
    harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
      schema_version: 1,
      operation_id: 'op-mon',
      division_id: 'monster',
      crew_id: cMonster.id,
      expected_revision: 0,
      criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      deductions: [],
    });
    harness.lockDivision('ph', 'manila-session-2027', 'monster', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'monster');

    const pOpen = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    const pMonster = harness.getPublicResultsProjection('manila-session-2027', 'monster');
    assert.equal(pOpen.standings.length, 2);
    assert.equal(pMonster.standings.length, 1);
  });

  test('T2-F33-2: Empty division publication projection returns empty standings array', () => {
    harness.divisions.set('manila-session-2027:empty-pub', { id: 'empty-pub', name: 'Empty', min_members: 1, max_members: 5, max_duration_secs: 180, fee_minor: 100000 });
    harness.divisionLocks.set('manila-session-2027:empty-pub', true);
    harness.judgePanels.set('manila-session-2027:empty-pub', ['staff-judge-1']);
    harness.publishDivisionResults('ph', 'manila-session-2027', 'empty-pub');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'empty-pub');
    assert.equal(proj.standings.length, 0);
  });

  test('T2-F33-3: Public projection output is serializable to valid JSON', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    const serialized = JSON.stringify(proj);
    assert.doesNotThrow(() => JSON.parse(serialized));
  });

  test('T2-F33-4: Projection for non-existent event returns 404', () => {
    assert.throws(
      () => harness.getPublicResultsProjection('phantom-event', 'open-crew'),
      /Division results not yet published/
    );
  });

  test('T2-F33-5: Standings preserve rank sorting in public view', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.ok(proj.standings[0].final_score >= proj.standings[1].final_score);
  });

  // --- Feature 34: Arena Broadcast HUD Boundaries ---
  test('T2-F34-1: Arena HUD returns exact standings array matching public projection', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    const proj = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.deepEqual(hud.standings, proj.standings);
  });

  test('T2-F34-2: Arena HUD reports city string for location context', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.equal(hud.standings[0].city, 'Manila');
    assert.equal(hud.standings[1].city, 'Quezon City');
  });

  test('T2-F34-3: Successive polling of HUD returns identical payload without drift', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const h1 = harness.getArenaHud('manila-session-2027', 'open-crew');
    const h2 = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.deepEqual(h1, h2);
  });

  test('T2-F34-4: HUD payload is lightweight and excludes heavy metadata', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    const size = Buffer.byteLength(JSON.stringify(hud));
    assert.ok(size < 1024, `HUD payload size ${size} should be small`);
  });

  test('T2-F34-5: Un-published event HUD returns 404', () => {
    assert.throws(
      () => harness.getArenaHud('manila-session-2027', 'un-published-open'),
      /Division results not yet published/
    );
  });

  // --- Feature 35: Dancer Venue Check-In Boundaries ---
  test('T2-F35-1: Minor dancer with verified consent checks in successfully', () => {
    const { crew1 } = setupCompletedDivision();
    crew1.members[1].is_minor = true;
    crew1.members[1].consent_verified = true;
    const pass = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
    assert.equal(pass.dancer_uid, crew1.members[1].uid);
  });

  test('T2-F35-2: Dancer in draft (unapproved) entry fails check-in with 403', () => {
    const crew = harness.createCrew('ph', 'mgr-draft-chk', 'Draft Crew', 'Manila');
    crew.members.push({ uid: 'dancer-draft', name: 'Dancer Draft', role: 'Dancer', is_minor: false, consent_verified: true });
    harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew'); // status is 'draft'

    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'dancer-draft', 'marshal'),
      /Dancer is not approved or not registered/
    );
  });

  test('T2-F35-3: Check-in for dancer in different chapter fails with 403', () => {
    const { crew1 } = setupCompletedDivision();
    assert.throws(
      () => harness.checkInDancer('hk', 'manila-session-2027', crew1.members[1].uid, 'marshal'),
      /Dancer is not approved or not registered/
    );
  });

  test('T2-F35-4: 50 repeated check-ins of same dancer return identical pass_id', () => {
    const { crew1 } = setupCompletedDivision();
    const firstPass = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
    for (let i = 0; i < 50; i++) {
      const repeated = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
      assert.equal(repeated.pass_id, firstPass.pass_id);
    }
  });

  test('T2-F35-5: Non-existent dancer UID fails check-in with 403', () => {
    setupCompletedDivision();
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'phantom-dancer-id', 'marshal'),
      /Dancer is not approved or not registered/
    );
  });

  // --- Feature 36: Stage Marshal Queue Boundaries ---
  test('T2-F36-1: Invalid stage status string throws 400', () => {
    const { e1 } = setupCompletedDivision();
    assert.throws(
      () => harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'backstage_invalid'),
      /Invalid stage status/
    );
  });

  test('T2-F36-2: Re-assigning same status to entry is idempotent', () => {
    const { e1 } = setupCompletedDivision();
    harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'holding');
    const res = harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'holding');
    assert.equal(res.status, 'holding');
  });

  test('T2-F36-3: Event with 0 queued entries returns empty stage queue', () => {
    const q = harness.getStageQueue('manila-session-2027');
    assert.equal(q.length, 0);
  });

  test('T2-F36-4: Multiple entries can progress independently through queue', () => {
    const { e1, e2 } = setupCompletedDivision();
    harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'stage');
    harness.updateStageQueue('ph', 'manila-session-2027', e2.id, 'marshal', 'holding');

    const q = harness.getStageQueue('manila-session-2027');
    assert.equal(q.find(i => i.entry_id === e1.id).status, 'stage');
    assert.equal(q.find(i => i.entry_id === e2.id).status, 'holding');
  });

  test('T2-F36-5: Queue update with non-existent entry throws 404', () => {
    assert.throws(
      () => harness.updateStageQueue('ph', 'manila-session-2027', 'phantom-entry', 'marshal', 'holding'),
      /Entry not found/
    );
  });

  // --- Feature 37: Native Contact Inquiries Boundaries ---
  test('T2-F37-1: Capability key is strictly 64 hex characters (256 bits)', () => {
    const inq = harness.createInquiry('ph', 'user@domain.com', 'Subject', 'Message');
    assert.equal(inq.capability_key.length, 64);
    assert.ok(/^[0-9a-f]{64}$/.test(inq.capability_key));
  });

  test('T2-F37-2: Inquiry with 10,000 characters in message succeeds', () => {
    const longMsg = 'Hello WSB '.repeat(1000);
    const inq = harness.createInquiry('ph', 'long@domain.com', 'Long Message', longMsg);
    assert.ok(inq.inquiry_id);
  });

  test('T2-F37-3: Whitespace-only subject is rejected with 400', () => {
    assert.throws(
      () => harness.createInquiry('ph', 'user@domain.com', '   \t  ', 'Message'),
      /Subject required/
    );
  });

  test('T2-F37-4: Whitespace-only message is rejected with 400', () => {
    assert.throws(
      () => harness.createInquiry('ph', 'user@domain.com', 'Subject', '   \n  '),
      /Message required/
    );
  });

  test('T2-F37-5: Non-existent inquiry lookup with capability key returns 403', () => {
    assert.throws(
      () => harness.getInquiryByCapability('inq-phantom', 'a'.repeat(64)),
      /Invalid capability key/
    );
  });

  // --- Feature 38: Chapter Support Queue Boundaries ---
  test('T2-F38-1: Chapter with 0 inquiries returns empty queue', () => {
    const q = harness.listSupportQueue('ph', 'support');
    assert.equal(q.length, 0);
  });

  test('T2-F38-2: Chapter support staff is isolated from other chapters', () => {
    harness.createInquiry('ph', 'ph@test.com', 'PH Q', 'PH text');
    harness.createInquiry('au', 'au@test.com', 'AU Q', 'AU text');

    const phQueue = harness.listSupportQueue('ph', 'support');
    const auQueue = harness.listSupportQueue('au', 'support');
    assert.equal(phQueue.length, 1);
    assert.equal(auQueue.length, 1);
    assert.equal(phQueue[0].email, 'ph@test.com');
  });

  test('T2-F38-3: Support queue query with unauthorized role fails with 403', () => {
    assert.throws(
      () => harness.listSupportQueue('ph', 'dancer'),
      /Unauthorized staff role/
    );
  });

  test('T2-F38-4: Director can inspect support queue in any chapter', () => {
    harness.createInquiry('ph', 'ph@dir.com', 'Dir Q', 'Text');
    const q = harness.listSupportQueue('ph', 'chapter_director');
    assert.equal(q.length, 1);
  });

  test('T2-F38-5: Support queue preserves inquiry email and creation timestamp', () => {
    harness.createInquiry('ph', 'persist@test.com', 'Persist Q', 'Text');
    const q = harness.listSupportQueue('ph', 'support');
    assert.equal(q[0].email, 'persist@test.com');
    assert.ok(q[0].created_at > 0);
  });

  // --- Feature 39: Brand Mark Boundaries ---
  test('T2-F39-1: Lowercase #ffffff is accepted as compliant pure white', () => {
    const svg = '<svg viewBox="0 0 10 10"><path fill="#ffffff" d="M0 0h10v10z"/></svg>';
    assert.equal(harness.validateBrandMark(svg).compliant, true);
  });

  test('T2-F39-2: Uppercase #FFFFFF is accepted as compliant pure white', () => {
    const svg = '<svg viewBox="0 0 10 10"><path fill="#FFFFFF" d="M0 0h10v10z"/></svg>';
    assert.equal(harness.validateBrandMark(svg).compliant, true);
  });

  test('T2-F39-3: Short hex #fff is accepted as compliant pure white', () => {
    const svg = '<svg viewBox="0 0 10 10"><path fill="#fff" d="M0 0h10v10z"/></svg>';
    assert.equal(harness.validateBrandMark(svg).compliant, true);
  });

  test('T2-F39-4: Mixed fills with any non-white color (e.g. #000000) fail compliance', () => {
    const svg = '<svg viewBox="0 0 10 10"><path fill="#ffffff" d="M0 0h5v10z"/><path fill="#000000" d="M5 0h5v10z"/></svg>';
    assert.equal(harness.validateBrandMark(svg).compliant, false);
  });

  test('T2-F39-5: Transparent fill="none" paths are accepted', () => {
    const svg = '<svg viewBox="0 0 10 10"><rect fill="none" width="10" height="10"/></svg>';
    assert.equal(harness.validateBrandMark(svg).compliant, true);
  });

  // --- Feature 40: Muted Hero Video Boundaries ---
  test('T2-F40-1: Hero video with all compliant flags evaluates compliant: true', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: true };
    assert.equal(harness.validateHeroVideoProps(props).compliant, true);
  });

  test('T2-F40-2: loop: false fails compliance for continuous hero ambience', () => {
    const props = { muted: true, playsInline: true, loop: false, autoPlay: true, ariaHidden: true };
    assert.equal(harness.validateHeroVideoProps(props).compliant, false);
  });

  test('T2-F40-3: autoPlay: false fails compliance for background hero', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: false, ariaHidden: true };
    assert.equal(harness.validateHeroVideoProps(props).compliant, false);
  });

  test('T2-F40-4: ariaHidden: false fails accessibility for decorative video', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: false };
    assert.equal(harness.validateHeroVideoProps(props).compliant, false);
  });

  test('T2-F40-5: Static poster fallback is detected when poster path is provided', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: true, poster: '/brand/wsb-hero.jpg' };
    const res = harness.validateHeroVideoProps(props);
    assert.equal(res.compliant, true);
    assert.equal(res.motionSafeFallback, true);
  });
});
