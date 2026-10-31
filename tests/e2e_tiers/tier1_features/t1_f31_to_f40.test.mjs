import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 1: Feature Coverage (F31 - F40)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupCompletedDivision() {
    const crew1 = harness.createCrew('ph', 'mgr-pub-1', 'Pub Crew 1', 'Manila');
    const crew2 = harness.createCrew('ph', 'mgr-pub-2', 'Pub Crew 2', 'Quezon City');
    for (let i = 1; i <= 5; i++) {
      crew1.members.push({ uid: `p1-${i}`, name: `P1 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      crew2.members.push({ uid: `p2-${i}`, name: `P2 D${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const e1 = harness.createEntryDraft('ph', 'manila-session-2027', crew1.id, 'open-crew');
    const e2 = harness.createEntryDraft('ph', 'manila-session-2027', crew2.id, 'open-crew');
    e1.status = 'approved';
    e2.status = 'approved';

    // Panel is: staff-judge-1, staff-judge-2, staff-judge-3
    // Crew 1 scores: 90, 90, 90 -> avg 90
    // Crew 2 scores: 85, 85, 85 -> avg 85
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

  // --- Feature 31: Division Results Tabulation ---
  test('F31-1: Computes raw average across panel judges', () => {
    const { crew1, crew2 } = setupCompletedDivision();
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const r1 = results.find(r => r.crew_id === crew1.id);
    const r2 = results.find(r => r.crew_id === crew2.id);
    assert.equal(r1.raw_average, 90);
    assert.equal(r2.raw_average, 85);
  });

  test('F31-2: Subtracts deductions from raw average to determine final_score', () => {
    const { crew1 } = setupCompletedDivision();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'ded-1', reason: 'Penalty', points: 2.5 }]);
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    const r1 = results.find(r => r.crew_id === crew1.id);
    assert.equal(r1.raw_average, 90);
    assert.equal(r1.total_deductions, 2.5);
    assert.equal(r1.final_score, 87.5);
  });

  test('F31-3: Results sorted in descending final_score order', () => {
    const { crew1, crew2 } = setupCompletedDivision();
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].crew_id, crew1.id);
    assert.equal(results[1].crew_id, crew2.id);
  });

  test('F31-4: Assigns rank numbers correctly', () => {
    const { crew1, crew2 } = setupCompletedDivision();
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].rank, 1);
    assert.equal(results[1].rank, 2);
  });

  test('F31-5: Equal final scores receive tied rank', () => {
    const { crew1, crew2 } = setupCompletedDivision();
    // Apply 5.0 deduction to crew 1 so both have final score 85.0
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'tie', reason: 'Tied', points: 5.0 }]);
    const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(results[0].final_score, 85);
    assert.equal(results[1].final_score, 85);
    assert.equal(results[0].rank, 1);
    assert.equal(results[1].rank, 1);
  });

  // --- Feature 32: Immutable Results Publication ---
  test('F32-1: Publishes signed snapshot of division results', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.ok(snapshot.publication_id.startsWith('pub-'));
    assert.equal(snapshot.division_id, 'open-crew');
    assert.equal(snapshot.results.length, 2);
  });

  test('F32-2: Generates 64-char SHA-256 digest of published results', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');
    assert.equal(snapshot.digest.length, 64);
  });

  test('F32-3: Publishing un-locked division fails with 409', () => {
    setupCompletedDivision(); // not locked yet
    assert.throws(
      () => harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew'),
      /Division must be locked before publication/
    );
  });

  test('F32-4: Publishing tied results without tie-approval flag fails with 409', () => {
    const { crew1 } = setupCompletedDivision();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'tie', reason: 'Tie', points: 5.0 }]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    assert.throws(
      () => harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', false),
      /Unresolved ties exist/
    );
  });

  test('F32-5: Publishing with tie-approval flag true succeeds on tied rankings', () => {
    const { crew1 } = setupCompletedDivision();
    harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew1.id, 'head_judge', [{ code: 'tie', reason: 'Tie', points: 5.0 }]);
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');

    const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew', true);
    assert.equal(snapshot.results[0].rank, 1);
    assert.equal(snapshot.results[1].rank, 1);
  });

  // --- Feature 33: Public Event Results Projection ---
  test('F33-1: Public projection returns clean standings for published division', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const projection = harness.getPublicResultsProjection('manila-session-2027', 'open-crew');
    assert.equal(projection.standings.length, 2);
    assert.equal(projection.standings[0].rank, 1);
  });

  test('F33-2: Public projection strictly omits all judge UIDs', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const text = JSON.stringify(harness.getPublicResultsProjection('manila-session-2027', 'open-crew'));
    assert.ok(!text.includes('judge_uid'));
    assert.ok(!text.includes('staff-judge-1'));
  });

  test('F33-3: Public projection strictly omits raw criteria breakdowns', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const text = JSON.stringify(harness.getPublicResultsProjection('manila-session-2027', 'open-crew'));
    assert.ok(!text.includes('choreography'));
    assert.ok(!text.includes('musicality'));
    assert.ok(!text.includes('stage_presence'));
  });

  test('F33-4: Public projection strictly omits dancer UIDs and personal PII', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const text = JSON.stringify(harness.getPublicResultsProjection('manila-session-2027', 'open-crew'));
    assert.ok(!text.includes('dancer_uid'));
    assert.ok(!text.includes('p1-1'));
  });

  test('F33-5: Querying un-published division returns 404', () => {
    assert.throws(
      () => harness.getPublicResultsProjection('manila-session-2027', 'un-published-div'),
      /results not yet published/
    );
  });

  // --- Feature 34: Arena Broadcast HUD ---
  test('F34-1: Arena HUD returns live leaderboard projection', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.equal(hud.standings[0].rank, 1);
    assert.equal(hud.standings[0].crew_name, 'Pub Crew 1');
  });

  test('F34-2: Arena HUD contains accurate rank, crew_name, city, and final_score', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    const s = hud.standings[0];
    assert.equal(s.rank, 1);
    assert.equal(s.crew_name, 'Pub Crew 1');
    assert.equal(s.city, 'Manila');
    assert.equal(s.final_score, 90);
  });

  test('F34-3: Arena HUD preserves publication digest for integrity verification', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    const pub = harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.equal(hud.digest, pub.digest);
  });

  test('F34-4: Arena HUD updates immediately upon new division publication', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const hud = harness.getArenaHud('manila-session-2027', 'open-crew');
    assert.equal(hud.standings.length, 2);
  });

  test('F34-5: Arena HUD projection contains zero billing or provider references', () => {
    setupCompletedDivision();
    harness.lockDivision('ph', 'manila-session-2027', 'open-crew', 'head_judge');
    harness.publishDivisionResults('ph', 'manila-session-2027', 'open-crew');

    const text = JSON.stringify(harness.getArenaHud('manila-session-2027', 'open-crew'));
    assert.ok(!text.includes('provider_reference'));
    assert.ok(!text.includes('paid_minor'));
  });

  // --- Feature 35: Dancer Venue Check-In ---
  test('F35-1: Stage marshal scans dancer pass and marks checked in', () => {
    const { crew1 } = setupCompletedDivision();
    const pass = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
    assert.ok(pass.pass_id.startsWith('pass-'));
    assert.equal(pass.dancer_uid, crew1.members[1].uid);
  });

  test('F35-2: Checked-in record records timestamp and scanner UID', () => {
    const { crew1 } = setupCompletedDivision();
    const pass = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[2].uid, 'marshal');
    assert.ok(pass.checked_in_at > 0);
    assert.equal(pass.scanner_uid, 'scanner');
  });

  test('F35-3: Non-eligible dancer check-in fails with 403', () => {
    setupCompletedDivision();
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'unregistered-dancer', 'marshal'),
      /Dancer is not approved or not registered/
    );
  });

  test('F35-4: Unauthorized role scanning pass fails with 403', () => {
    const { crew1 } = setupCompletedDivision();
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'judge'),
      /Only stage marshal or director can scan passes/
    );
  });

  test('F35-5: Re-scanning dancer pass is idempotent', () => {
    const { crew1 } = setupCompletedDivision();
    const p1 = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
    const p2 = harness.checkInDancer('ph', 'manila-session-2027', crew1.members[1].uid, 'marshal');
    assert.equal(p1.pass_id, p2.pass_id);
  });

  // --- Feature 36: Stage Marshal Queue ---
  test('F36-1: Stage marshal updates entry queue status to holding', () => {
    const { e1 } = setupCompletedDivision();
    const res = harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'holding');
    assert.equal(res.status, 'holding');
  });

  test('F36-2: Progression from holding to on_deck to stage', () => {
    const { e1 } = setupCompletedDivision();
    harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'holding');
    harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'on_deck');
    const res = harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'stage');
    assert.equal(res.status, 'stage');
  });

  test('F36-3: Non-marshal role cannot update stage queue (403)', () => {
    const { e1 } = setupCompletedDivision();
    assert.throws(
      () => harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'dancer', 'holding'),
      /Only stage marshal can update queue/
    );
  });

  test('F36-4: Non-approved entry cannot be placed on stage queue (400)', () => {
    const crew = harness.createCrew('ph', 'mgr-unappr', 'Unapproved Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.throws(
      () => harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'holding'),
      /Only approved entries can be queued/
    );
  });

  test('F36-5: Queue status listing reflects active positions', () => {
    const { e1, e2 } = setupCompletedDivision();
    harness.updateStageQueue('ph', 'manila-session-2027', e1.id, 'marshal', 'stage');
    harness.updateStageQueue('ph', 'manila-session-2027', e2.id, 'marshal', 'on_deck');

    const q = harness.getStageQueue('manila-session-2027');
    assert.equal(q.length, 2);
    assert.equal(q.find(i => i.entry_id === e1.id).status, 'stage');
    assert.equal(q.find(i => i.entry_id === e2.id).status, 'on_deck');
  });

  // --- Feature 37: Native Contact Inquiries ---
  test('F37-1: Visitor submits contact inquiry and receives 256-bit capability key', () => {
    const inq = harness.createInquiry('ph', 'visitor@example.com', 'Ticket question', 'How much are passes?');
    assert.ok(inq.inquiry_id.startsWith('inq-'));
    assert.equal(inq.capability_key.length, 64); // 32 bytes hex = 64 hex chars = 256 bits
    assert.equal(inq.status, 'open');
  });

  test('F37-2: Visitor retrieves inquiry thread using valid capability key', () => {
    const created = harness.createInquiry('ph', 'visitor2@example.com', 'Registration question', 'Can I register?');
    const retrieved = harness.getInquiryByCapability(created.inquiry_id, created.capability_key);
    assert.equal(retrieved.email, 'visitor2@example.com');
    assert.equal(retrieved.subject, 'Registration question');
  });

  test('F37-3: Invalid capability key is rejected with 403', () => {
    const created = harness.createInquiry('ph', 'visitor3@example.com', 'Subject', 'Message');
    assert.throws(
      () => harness.getInquiryByCapability(created.inquiry_id, 'wrong-capability-key'),
      /Invalid capability key/
    );
  });

  test('F37-4: Invalid email format in inquiry fails with 400', () => {
    assert.throws(
      () => harness.createInquiry('ph', 'not-an-email', 'Subject', 'Message'),
      /Valid email required/
    );
  });

  test('F37-5: Blank subject or message in inquiry fails with 400', () => {
    assert.throws(
      () => harness.createInquiry('ph', 'test@test.com', '   ', 'Message'),
      /Subject required/
    );
    assert.throws(
      () => harness.createInquiry('ph', 'test@test.com', 'Subject', '   '),
      /Message required/
    );
  });

  // --- Feature 38: Chapter Support Queue & Proposals ---
  test('F38-1: Chapter support staff lists inquiry queue', () => {
    harness.createInquiry('ph', 'dance-studio@example.com', 'Partnership proposal', 'We want to host.');
    const queue = harness.listSupportQueue('ph', 'support');
    assert.ok(queue.length >= 1);
    assert.equal(queue[0].subject, 'Partnership proposal');
  });

  test('F38-2: Chapter director can also inspect support queue', () => {
    harness.createInquiry('ph', 'director-inq@example.com', 'HQ memo', 'Staff schedule inquiry.');
    const queue = harness.listSupportQueue('ph', 'chapter_director');
    assert.ok(queue.length >= 1);
  });

  test('F38-3: Unauthorized role cannot access support queue (403)', () => {
    assert.throws(
      () => harness.listSupportQueue('ph', 'judge'),
      /Unauthorized staff role/
    );
  });

  test('F38-4: Support queue filters inquiries by chapter', () => {
    harness.createInquiry('ph', 'ph-visitor@example.com', 'PH event', 'Is Manila event active?');
    harness.createInquiry('hk', 'hk-visitor@example.com', 'HK event', 'Is HK event active?');

    const queuePh = harness.listSupportQueue('ph', 'support');
    const queueHk = harness.listSupportQueue('hk', 'support');
    assert.ok(queuePh.every(i => i.chapter_id === 'ph'));
    assert.ok(queueHk.every(i => i.chapter_id === 'hk'));
  });

  test('F38-5: Support queue items report open status upon creation', () => {
    harness.createInquiry('ph', 'new@example.com', 'Open Inquiry', 'Status check.');
    const queue = harness.listSupportQueue('ph', 'support');
    const inq = queue.find(i => i.email === 'new@example.com');
    assert.equal(inq.status, 'open');
  });

  // --- Feature 39: White Dark-Mode Brand Mark ---
  test('F39-1: White brand mark SVG uses pure white fill', () => {
    const svg = '<svg viewBox="0 0 100 100"><path fill="#ffffff" d="M10 10h80v80H10z"/></svg>';
    const check = harness.validateBrandMark(svg);
    assert.equal(check.compliant, true);
  });

  test('F39-2: SVG maintains transparent fill: none geometry', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect fill="none" width="100" height="100"/><path fill="white" d="M0 0h50v50H0z"/></svg>';
    const check = harness.validateBrandMark(svg);
    assert.equal(check.compliant, true);
  });

  test('F39-3: Colored fills (e.g. #ff0000) are flagged non-compliant', () => {
    const svg = '<svg viewBox="0 0 100 100"><path fill="#ff0000" d="M10 10h80v80H10z"/></svg>';
    const check = harness.validateBrandMark(svg);
    assert.equal(check.compliant, false);
  });

  test('F39-4: Invalid SVG markup throws 400', () => {
    assert.throws(
      () => harness.validateBrandMark('<div>not an svg</div>'),
      /Invalid SVG markup/
    );
  });

  test('F39-5: Pure white currentColor fill is accepted', () => {
    const svg = '<svg viewBox="0 0 100 100"><path fill="currentColor" d="M10 10h80v80H10z"/></svg>';
    const check = harness.validateBrandMark(svg);
    assert.equal(check.compliant, true);
  });

  // --- Feature 40: Decorative Muted Hero Video ---
  test('F40-1: Hero video props include muted: true', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: true };
    const check = harness.validateHeroVideoProps(props);
    assert.equal(check.compliant, true);
  });

  test('F40-2: Unmuted hero video fails compliance', () => {
    const props = { muted: false, playsInline: true, loop: true, autoPlay: true, ariaHidden: true };
    const check = harness.validateHeroVideoProps(props);
    assert.equal(check.compliant, false);
  });

  test('F40-3: Playsinline required for mobile inline rendering without fullscreen takeover', () => {
    const props = { muted: true, playsInline: false, loop: true, autoPlay: true, ariaHidden: true };
    const check = harness.validateHeroVideoProps(props);
    assert.equal(check.compliant, false);
  });

  test('F40-4: Hero video is marked ariaHidden: true for decorative accessibility', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: false };
    const check = harness.validateHeroVideoProps(props);
    assert.equal(check.compliant, false);
  });

  test('F40-5: Poster attribute provides motion-safe static fallback', () => {
    const props = { muted: true, playsInline: true, loop: true, autoPlay: true, ariaHidden: true, poster: '/brand/hero-poster.jpg' };
    const check = harness.validateHeroVideoProps(props);
    assert.equal(check.compliant, true);
    assert.equal(check.motionSafeFallback, true);
  });
});
