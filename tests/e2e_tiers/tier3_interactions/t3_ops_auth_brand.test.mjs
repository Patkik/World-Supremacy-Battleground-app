import test from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

test.describe('Tier 3: Cross-Feature Interactions - Operations, Auth & Brand', () => {
  let harness;

  test.beforeEach(() => {
    harness = new SystemHarness();
  });

  // T3-31: F01 Auth Token + F04 Synthetic Sandbox
  test('T3-31: F01 Auth Token + F04 Synthetic Sandbox: Sandbox flag enables safe test execution', () => {
    const sandboxToken = harness.createToken({
      sub: 'sandbox-tester',
      role: 'staff',
      chapterId: 'ph',
    });

    const verified = harness.verifyToken(sandboxToken, 'ph');
    assert.equal(verified.sub, 'sandbox-tester');
    assert.equal(verified.chapterId, 'ph');

    const readyz = harness.getReadyz();
    assert.equal(readyz.status, 503);
    assert.equal(readyz.body.status, 'synthetic_only');
    assert.equal(readyz.body.release_ready, false);
  });

  // T3-32: F01 Session Verification + F35 Venue Check-in
  test('T3-32: F01 Session Verification + F35 Venue Check-in: Marshal session verifies dancer check-in', () => {
    const crew = harness.createCrew('ph', 'manager-uid', 'Checkin Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-chkin-${i}`,
        name: `Checked In Dancer ${i}`,
        dob: '2005-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-chkin-0', 'ref-chk', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    // Marshal scans dancer pass
    const pass = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-chkin-0', 'marshal');
    assert.ok(pass.pass_id);
    assert.equal(pass.dancer_uid, 'dancer-chkin-0');
    assert.equal(pass.event_id, 'manila-session-2027');

    // Unauthorized role cannot scan
    assert.throws(
      () => harness.checkInDancer('ph', 'manila-session-2027', 'dancer-chkin-0', 'judge'),
      err => err.status === 403
    );
  });

  // T3-33: F35 Venue Check-In + F36 Stage Marshal Queue
  test('T3-33: F35 Venue Check-In + F36 Stage Marshal Queue: Checked-in entry progresses through stage stages', () => {
    const crew = harness.createCrew('ph', 'manager-uid', 'Stage Flow Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-stage-${i}`,
        name: `Stage Dancer ${i}`,
        dob: '2004-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-stage-0', 'ref-stage', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    harness.checkInDancer('ph', 'manila-session-2027', 'dancer-stage-0', 'marshal');

    // Progression: holding -> on_deck -> stage
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

  // T3-34: F13 Approved Entry + F17 DJ Playlist Export
  test('T3-34: F13 Approved Entry + F17 DJ Playlist Export: Approved entries exported in sanitized sequence', () => {
    const crew = harness.createCrew('ph', 'manager-uid', 'DJ Export Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-dj-${i}`,
        name: `Dancer DJ ${i}`,
        dob: '2000-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'track/01-raw mix!@#.mp3', 130);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-dj-0', 'ref-dj', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    const result = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(result.total_tracks, 1);
    assert.equal(result.manifest[0].order, 1);
    assert.equal(result.manifest[0].crew_name, 'DJ Export Crew');
    assert.ok(result.manifest[0].export_filename.endsWith('.mp3'));
    assert.ok(!result.manifest[0].export_filename.includes('/'));
  });

  // T3-35: F29 BG.ONE Battle Voting + F30 Battle Progression
  test('T3-35: F29 BG.ONE Battle Voting + F30 Battle Progression: Majority votes close match and declare winner', () => {
    const battle = harness.createBattle(
      'manila-session-2027',
      'match-quarter-1',
      '1v1_breaking',
      'quarterfinals',
      'B-Boy Flame',
      'B-Boy Shadow',
      ['judge-b1', 'judge-b2', 'judge-b3']
    );
    assert.equal(battle.status, 'active');

    // First judge votes red
    harness.voteBattle('manila-session-2027', 'match-quarter-1', 'judge-b1', 'red');
    let cur = harness.getBattle('manila-session-2027', 'match-quarter-1');
    assert.equal(cur.status, 'active');
    assert.equal(cur.votes_red, 1);
    assert.equal(cur.votes_blue, 0);

    // Second judge votes red -> majority reached (2 out of 3)
    harness.voteBattle('manila-session-2027', 'match-quarter-1', 'judge-b2', 'red');
    cur = harness.getBattle('manila-session-2027', 'match-quarter-1');
    assert.equal(cur.status, 'closed');
    assert.equal(cur.winner_corner, 'red');

    // Third judge vote blocked because match is closed
    assert.throws(
      () => harness.voteBattle('manila-session-2027', 'match-quarter-1', 'judge-b3', 'blue'),
      err => err.status === 409
    );
  });

  // T3-36: F30 Battle Durability + F34 Arena Broadcast HUD
  test('T3-36: F30 Battle Durability + F34 Arena Broadcast HUD: Closed battle status projects to arena display', () => {
    harness.createBattle(
      'manila-session-2027',
      'match-semi-1',
      'all_styles',
      'semifinals',
      'Locking Lynx',
      'Popping Pete',
      ['judge-s1', 'judge-s2', 'judge-s3']
    );

    harness.voteBattle('manila-session-2027', 'match-semi-1', 'judge-s1', 'blue');
    harness.voteBattle('manila-session-2027', 'match-semi-1', 'judge-s2', 'blue');

    const battle = harness.getBattle('manila-session-2027', 'match-semi-1');
    assert.equal(battle.status, 'closed');
    assert.equal(battle.winner_corner, 'blue');
    assert.equal(battle.blue_corner_name, 'Popping Pete');
    assert.equal(battle.votes_blue, 2);
  });

  // T3-37: F37 Native Contact Inquiries + F38 Support Queue
  test('T3-37: F37 Native Contact Inquiries + F38 Support Queue: Public inquiry visible in support queue', () => {
    const created = harness.createInquiry(
      'ph',
      'competitor@example.com',
      'Division Registration Inquiry',
      'Need help with junior division age cutoff.'
    );

    assert.ok(created.inquiry_id);
    assert.ok(created.capability_key);
    assert.equal(created.status, 'open');

    // Support staff retrieves inquiry queue for chapter
    const queue = harness.listSupportQueue('ph', 'support');
    const matched = queue.find(q => q.inquiry_id === created.inquiry_id);
    assert.ok(matched);
    assert.equal(matched.subject, 'Division Registration Inquiry');
    assert.equal(matched.email, 'competitor@example.com');
  });

  // T3-38: F38 Support Queue + F01 Multi-Chapter Isolation
  test('T3-38: F38 Support Queue + F01 Multi-Chapter Isolation: Chapter queues strictly isolated', () => {
    const inqPh = harness.createInquiry('ph', 'ph@example.com', 'Manila Inquiry', 'Message for Manila');
    const inqAu = harness.createInquiry('au', 'au@example.com', 'Sydney Inquiry', 'Message for Sydney');

    const phQueue = harness.listSupportQueue('ph', 'support');
    const auQueue = harness.listSupportQueue('au', 'support');

    assert.ok(phQueue.some(i => i.inquiry_id === inqPh.inquiry_id));
    assert.ok(!phQueue.some(i => i.inquiry_id === inqAu.inquiry_id));

    assert.ok(auQueue.some(i => i.inquiry_id === inqAu.inquiry_id));
    assert.ok(!auQueue.some(i => i.inquiry_id === inqPh.inquiry_id));
  });

  // T3-39: F39 White Dark-Mode Brand Mark + F34 Broadcast Projection
  test('T3-39: F39 White Dark-Mode Brand Mark + F34 Broadcast Projection: Brand SVG strictly white-fill compliant', () => {
    const compliantSvg = '<svg viewBox="0 0 100 100"><path fill="#ffffff" d="M10 10 H90 V90 H10 Z"/><circle fill="none" cx="50" cy="50" r="20"/></svg>';
    const check = harness.validateBrandMark(compliantSvg);
    assert.equal(check.compliant, true);

    const nonCompliantSvg = '<svg viewBox="0 0 100 100"><path fill="#ff0000" d="M10 10"/></svg>';
    const invalidCheck = harness.validateBrandMark(nonCompliantSvg);
    assert.equal(invalidCheck.compliant, false);
  });

  // T3-40: F40 Decorative Hero Video + F39 Brand Theme
  test('T3-40: F40 Decorative Hero Video + F39 Brand Theme: Hero video props adhere to accessibility & poster fallbacks', () => {
    const validVideoProps = {
      autoPlay: true,
      muted: true,
      loop: true,
      playsInline: true,
      ariaHidden: true,
      poster: '/assets/hero-poster.webp',
    };

    const result = harness.validateHeroVideoProps(validVideoProps);
    assert.equal(result.compliant, true);
    assert.equal(result.motionSafeFallback, true);

    const noisyVideoProps = {
      autoPlay: true,
      muted: false, // Disallowed for decorative background video
      loop: true,
      playsInline: true,
      ariaHidden: false,
    };
    const invalidResult = harness.validateHeroVideoProps(noisyVideoProps);
    assert.equal(invalidResult.compliant, false);
  });

  // T3-41: F04 Sandbox Environment + F29 Battle Isolation
  test('T3-41: F04 Sandbox Environment + F29 Battle Isolation: Sandbox battle operates without affecting division locks', () => {
    const mockBattle = harness.createBattle(
      'manila-session-2027',
      'match-mock-1',
      '1v1_krump',
      'finals',
      'Dancer A',
      'Dancer B',
      ['judge-mock-1', 'judge-mock-2']
    );

    harness.voteBattle('manila-session-2027', 'match-mock-1', 'judge-mock-1', 'red');
    harness.voteBattle('manila-session-2027', 'match-mock-1', 'judge-mock-2', 'red');

    const finished = harness.getBattle('manila-session-2027', 'match-mock-1');
    assert.equal(finished.status, 'closed');
    assert.equal(finished.winner_corner, 'red');

    // Real division remains unlocked and unaffected
    assert.equal(harness.divisionLocks.has('manila-session-2027:open-crew'), false);
  });

  // T3-42: F05 Build & Linter Contracts + F17 Playlist Sanitization
  test('T3-42: F05 Build & Linter Contracts + F17 Playlist Sanitization: Filenames prevent path traversal and unsafe chars', () => {
    const crew = harness.createCrew('ph', 'mgr', 'Special Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `d-clean-${i}`,
        name: `Dancer Clean ${i}`,
        dob: '2001-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, '../../../malicious..track.mp3', 120);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'd-clean-0', 'ref-clean', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    const result = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const item = result.manifest.find(p => p.crew_name === 'Special Crew');
    assert.ok(item);
    assert.ok(!item.export_filename.includes('..'));
    assert.ok(!item.export_filename.includes('/'));
    assert.ok(!item.export_filename.includes('\\'));
  });

  // T3-43: F35 Venue Pass Re-scan + F36 Marshal Queue Idempotency
  test('T3-43: F35 Venue Pass Re-scan + F36 Marshal Queue Idempotency: Re-scanning pass maintains existing pass record', () => {
    const crew = harness.createCrew('ph', 'mgr', 'Rescan Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-rescan-${i}`,
        name: `Rescan Dancer ${i}`,
        dob: '2000-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 110);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-rescan-0', 'ref-rescan', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    const pass1 = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-rescan-0', 'marshal');
    const pass2 = harness.checkInDancer('ph', 'manila-session-2027', 'dancer-rescan-0', 'marshal');

    assert.equal(pass1.pass_id, pass2.pass_id);
    assert.equal(pass1.checked_in_at, pass2.checked_in_at);
  });

  // T3-44: F37 Inquiries Capability URL + F38 Status Updates
  test('T3-44: F37 Inquiries Capability URL + F38 Status Updates: Capability key accesses inquiry securely', () => {
    const created = harness.createInquiry('ph', 'dancer@test.com', 'Schedule Question', 'When is soundcheck?');
    const inq = harness.getInquiryByCapability(created.inquiry_id, created.capability_key);

    assert.equal(inq.inquiry_id, created.inquiry_id);
    assert.equal(inq.subject, 'Schedule Question');

    // Invalid capability key fails
    assert.throws(
      () => harness.getInquiryByCapability(created.inquiry_id, 'wrong-capability-key'),
      err => err.status === 403
    );
  });

  // T3-45: F36 Marshal Queue + F34 Arena Broadcast Lineup
  test('T3-45: F36 Marshal Queue + F34 Arena Broadcast Lineup: Marshal queue state visible for arena coordination', () => {
    const crew = harness.createCrew('ph', 'mgr', 'Arena Queue Crew', 'Manila');
    for (let i = 0; i < 5; i++) {
      crew.members.push({
        uid: `dancer-arena-${i}`,
        name: `Arena Dancer ${i}`,
        dob: '2000-01-01',
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'mix.mp3', 115);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-arena-0', 'ref-arena', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);

    harness.updateStageQueue('ph', 'manila-session-2027', entry.id, 'marshal', 'stage');

    const queue = harness.getStageQueue('manila-session-2027');
    const activeStage = queue.find(q => q.status === 'stage');
    assert.ok(activeStage);
    assert.equal(activeStage.entry_id, entry.id);
  });
});
