import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 1: Feature Coverage (F01 - F10)', () => {
  const harness = new SystemHarness();

  // --- Feature 1: Chapter Session & Token Verification ---
  test('F01-1: Valid RS256 token returns verified claims', () => {
    const token = harness.createToken({ sub: 'user-ph-1', chapterId: 'ph', role: 'crew_manager' });
    const verified = harness.verifyToken(token, 'ph');
    assert.equal(verified.sub, 'user-ph-1');
    assert.equal(verified.chapterId, 'ph');
    assert.equal(verified.role, 'crew_manager');
  });

  test('F01-2: Reject unsigned token (alg: "none")', () => {
    const unsignedToken = harness.createToken({ alg: 'none', sub: 'hacker' });
    assert.throws(() => harness.verifyToken(unsignedToken, 'ph'), /Only RS256/);
  });

  test('F01-3: Reject token with mismatched chapter ID', () => {
    const token = harness.createToken({ sub: 'user-1', chapterId: 'hk' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Cross-chapter access forbidden/);
  });

  test('F01-4: Reject expired token', () => {
    const expiredToken = harness.createToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    assert.throws(() => harness.verifyToken(expiredToken, 'ph'), /Token expired/);
  });

  test('F01-5: Reject token when chapter membership is inactive', () => {
    harness.memberships.set('ph:revoked-user', {
      uid: 'revoked-user',
      chapter_id: 'ph',
      role: 'judge',
      active: false,
      valid_after: 0,
    });
    const token = harness.createToken({ sub: 'revoked-user', chapterId: 'ph', role: 'judge' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Membership inactive or revoked/);
  });

  // --- Feature 2: Chapter & Event Discovery ---
  test('F02-1: List all active registered chapters', () => {
    const chapters = harness.listChapters();
    assert.ok(chapters.length >= 3);
    assert.ok(chapters.some(c => c.id === 'ph' && c.currency === 'PHP'));
    assert.ok(chapters.some(c => c.id === 'hk' && c.currency === 'HKD'));
  });

  test('F02-2: Retrieve specific chapter details', () => {
    const chapter = harness.getChapter('ph');
    assert.equal(chapter.id, 'ph');
    assert.equal(chapter.currency, 'PHP');
  });

  test('F02-3: List events filtered by chapter', () => {
    const events = harness.listEvents('ph');
    assert.ok(events.length >= 1);
    assert.equal(events[0].id, 'manila-session-2027');
    assert.equal(events[0].chapter_id, 'ph');
  });

  test('F02-4: Retrieve specific localized event metadata', () => {
    const event = harness.getEvent('ph', 'manila-session-2027');
    assert.equal(event.name, 'Manila Session 2027');
    assert.equal(event.status, 'active');
    assert.equal(event.rules_version, '2027.1');
  });

  test('F02-5: Non-existent chapter returns 404', () => {
    assert.throws(() => harness.getChapter('non-existent'), /Chapter not found/);
  });

  // --- Feature 3: Division Configuration Read ---
  test('F03-1: List divisions for a valid event', () => {
    const divs = harness.listDivisions('manila-session-2027');
    assert.ok(divs.length >= 1);
    assert.equal(divs[0].id, 'open-crew');
  });

  test('F03-2: Read division parameters (roster bounds, duration, fee)', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.equal(div.min_members, 5);
    assert.equal(div.max_members, 20);
    assert.equal(div.max_duration_secs, 180);
    assert.equal(div.fee_minor, 120000);
  });

  test('F03-3: Verify integer minor fee units per division', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.equal(typeof div.fee_minor, 'number');
    assert.equal(Number.isInteger(div.fee_minor), true);
    assert.ok(div.fee_minor > 0);
  });

  test('F03-4: Requesting non-existent division returns 404', () => {
    assert.throws(() => harness.getDivision('manila-session-2027', 'non-existent'), /Division not found/);
  });

  test('F03-5: Multiple divisions in same event maintain distinct configurations', () => {
    harness.divisions.set('manila-session-2027:monster-crew', {
      id: 'monster-crew',
      name: 'Monster Crew Division',
      min_members: 21,
      max_members: 40,
      max_duration_secs: 240,
      max_age: null,
      fee_minor: 100000,
    });
    const monster = harness.getDivision('manila-session-2027', 'monster-crew');
    const open = harness.getDivision('manila-session-2027', 'open-crew');
    assert.notEqual(monster.min_members, open.min_members);
    assert.notEqual(monster.fee_minor, open.fee_minor);
  });

  // --- Feature 4: Synthetic Sandbox & Release Gates ---
  test('F04-1: Readyz returns 503 when release approval is pending', () => {
    harness.releaseReady = false;
    const readyz = harness.getReadyz();
    assert.equal(readyz.status, 503);
    assert.equal(readyz.body.release_ready, false);
  });

  test('F04-2: Readyz payload reports database_reachable: true in sandbox', () => {
    const readyz = harness.getReadyz();
    assert.equal(readyz.body.database_reachable, true);
  });

  test('F04-3: Readyz status indicates synthetic_only when unapproved', () => {
    harness.releaseReady = false;
    const readyz = harness.getReadyz();
    assert.equal(readyz.body.status, 'synthetic_only');
  });

  test('F04-4: Strict enforcement of demo-wsb sandbox project identifier', () => {
    assert.equal(harness.projectId, 'demo-wsb');
    const tokenForeignAudience = harness.createToken({ aud: 'production-wsb' });
    assert.throws(() => harness.verifyToken(tokenForeignAudience, 'ph'), /Audience mismatch/);
  });

  test('F04-5: Enabling release approval promotes readyz to 200 production_ready', () => {
    harness.releaseReady = true;
    const readyz = harness.getReadyz();
    assert.equal(readyz.status, 200);
    assert.equal(readyz.body.status, 'production_ready');
    harness.releaseReady = false; // reset
  });

  // --- Feature 5: Clippy & Build Hygiene ---
  test('F05-1: Build hygiene verifies zero compilation warnings', () => {
    const hygiene = harness.verifyBuildHygiene();
    assert.equal(hygiene.warnings, 0);
  });

  test('F05-2: Clippy verification confirms error-free builds', () => {
    const hygiene = harness.verifyBuildHygiene();
    assert.equal(hygiene.errors, 0);
  });

  test('F05-3: Domain schemas have clean boolean status indicators', () => {
    const hygiene = harness.verifyBuildHygiene();
    assert.equal(hygiene.clean, true);
  });

  test('F05-4: Enforces strict integer minor currency representation', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.ok(Number.isSafeInteger(div.fee_minor));
  });

  test('F05-5: Deterministic status reporting on build diagnostics', () => {
    const first = harness.verifyBuildHygiene();
    const second = harness.verifyBuildHygiene();
    assert.deepEqual(first, second);
  });

  // --- Feature 6: Crew Profile Creation ---
  test('F06-1: Crew manager creates crew profile successfully', () => {
    const crew = harness.createCrew('ph', 'mgr-1', 'Afterhours PH', 'Manila');
    assert.equal(crew.name, 'Afterhours PH');
    assert.equal(crew.chapter_id, 'ph');
    assert.equal(crew.manager_uid, 'mgr-1');
  });

  test('F06-2: Reject crew creation with blank name', () => {
    assert.throws(() => harness.createCrew('ph', 'mgr-1', '   ', 'Manila'), /Name cannot be empty/);
  });

  test('F06-3: Reject crew creation with duplicate name within same chapter', () => {
    harness.createCrew('ph', 'mgr-1', 'Legion PH', 'Quezon City');
    assert.throws(() => harness.createCrew('ph', 'mgr-2', 'legion ph', 'Manila'), /already taken/);
  });

  test('F06-4: Same crew name allowed in different chapters', () => {
    const phCrew = harness.createCrew('ph', 'mgr-1', 'Alliance Global', 'Manila');
    const hkCrew = harness.createCrew('hk', 'mgr-hk', 'Alliance Global', 'Kowloon');
    assert.notEqual(phCrew.chapter_id, hkCrew.chapter_id);
    assert.equal(phCrew.name, hkCrew.name);
  });

  test('F06-5: Creator is automatically assigned Manager role in members list', () => {
    const crew = harness.createCrew('ph', 'mgr-sole', 'Solo Crew', 'Cebu');
    assert.equal(crew.members.length, 1);
    assert.equal(crew.members[0].uid, 'mgr-sole');
    assert.equal(crew.members[0].role, 'Manager');
  });

  // --- Feature 7: Crew Invitation Generation ---
  test('F07-1: Crew manager generates valid single-use invitation', () => {
    const crew = harness.createCrew('ph', 'mgr-inv', 'Inviter Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-inv', 'Dancer');
    assert.ok(inv.token.length >= 16);
    assert.equal(inv.crew_id, crew.id);
    assert.equal(inv.used, false);
  });

  test('F07-2: Invitation token has valid expiration timestamp', () => {
    const crew = harness.createCrew('ph', 'mgr-inv-2', 'Expiry Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-inv-2', 'Dancer', 3600);
    assert.ok(inv.expires_at > Math.floor(Date.now() / 1000));
  });

  test('F07-3: Non-manager forbidden from generating crew invitation', () => {
    const crew = harness.createCrew('ph', 'mgr-real', 'Secure Crew', 'Manila');
    assert.throws(() => harness.createInvitation('ph', crew.id, 'imposter-uid', 'Dancer'), /Only crew manager can invite/);
  });

  test('F07-4: Successive invitations generate distinct cryptographic tokens', () => {
    const crew = harness.createCrew('ph', 'mgr-inv-multi', 'Multi Crew', 'Manila');
    const inv1 = harness.createInvitation('ph', crew.id, 'mgr-inv-multi', 'Dancer');
    const inv2 = harness.createInvitation('ph', crew.id, 'mgr-inv-multi', 'Dancer');
    assert.notEqual(inv1.token, inv2.token);
  });

  test('F07-5: Invitation records specified role properly', () => {
    const crew = harness.createCrew('ph', 'mgr-inv-role', 'Role Crew', 'Manila');
    const invDancer = harness.createInvitation('ph', crew.id, 'mgr-inv-role', 'Dancer');
    const invCoManager = harness.createInvitation('ph', crew.id, 'mgr-inv-role', 'Manager');
    assert.equal(invDancer.role, 'Dancer');
    assert.equal(invCoManager.role, 'Manager');
  });

  // --- Feature 8: Dancer Invitation Redemption ---
  test('F08-1: Adult dancer redeems invitation successfully', () => {
    const crew = harness.createCrew('ph', 'mgr-join', 'Join Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-join');
    const { member } = harness.redeemInvitation('ph', inv.token, 'dancer-adult-1', 'Adult Dancer', false);
    assert.equal(member.uid, 'dancer-adult-1');
    assert.equal(member.is_minor, false);
    assert.equal(member.consent_verified, true);
  });

  test('F08-2: Minor dancer joins with consent_verified false', () => {
    const crew = harness.createCrew('ph', 'mgr-join-minor', 'Minor Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-join-minor');
    const { member } = harness.redeemInvitation('ph', inv.token, 'minor-dancer-1', 'Young Dancer', true);
    assert.equal(member.is_minor, true);
    assert.equal(member.consent_verified, false);
  });

  test('F08-3: Re-using already redeemed invitation fails with 409', () => {
    const crew = harness.createCrew('ph', 'mgr-rejoin', 'Rejoin Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-rejoin');
    harness.redeemInvitation('ph', inv.token, 'dancer-1', 'Dancer 1', false);
    assert.throws(() => harness.redeemInvitation('ph', inv.token, 'dancer-2', 'Dancer 2', false), /Invitation already used/);
  });

  test('F08-4: Redeeming expired invitation fails with 410', () => {
    const crew = harness.createCrew('ph', 'mgr-exp', 'Expired Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-exp', 'Dancer', -10); // expired 10s ago
    assert.throws(() => harness.redeemInvitation('ph', inv.token, 'dancer-late', 'Late Dancer', false), /Invitation expired/);
  });

  test('F08-5: Joining with duplicate dancer UID is rejected', () => {
    const crew = harness.createCrew('ph', 'mgr-dup', 'Dup Crew', 'Manila');
    const inv1 = harness.createInvitation('ph', crew.id, 'mgr-dup');
    const inv2 = harness.createInvitation('ph', crew.id, 'mgr-dup');
    harness.redeemInvitation('ph', inv1.token, 'dancer-same', 'Dancer Same', false);
    assert.throws(() => harness.redeemInvitation('ph', inv2.token, 'dancer-same', 'Dancer Same', false), /already in crew/);
  });

  // --- Feature 9: Event Entry Draft Creation ---
  test('F09-1: Crew creates entry draft for event and division', () => {
    const crew = harness.createCrew('ph', 'mgr-entry', 'Draft Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry.status, 'draft');
    assert.equal(entry.crew_id, crew.id);
    assert.equal(entry.division_id, 'open-crew');
  });

  test('F09-2: Entry draft initializes roster from crew members', () => {
    const crew = harness.createCrew('ph', 'mgr-entry-2', 'Draft Crew 2', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry.roster.length, crew.members.length);
    assert.equal(entry.roster[0].uid, 'mgr-entry-2');
  });

  test('F09-3: Re-requesting draft creation for same crew & division returns existing entry', () => {
    const crew = harness.createCrew('ph', 'mgr-entry-3', 'Idempotent Draft', 'Manila');
    const entry1 = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const entry2 = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry1.id, entry2.id);
  });

  test('F09-4: Entry draft has initial paid_minor set to 0', () => {
    const crew = harness.createCrew('ph', 'mgr-entry-4', 'Paid 0 Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry.paid_minor, 0);
  });

  test('F09-5: Draft creation fails for non-existent event or division', () => {
    const crew = harness.createCrew('ph', 'mgr-entry-5', 'Invalid Event Crew', 'Manila');
    assert.throws(() => harness.createEntryDraft('ph', 'non-existent-event', crew.id, 'open-crew'), /Event not found/);
    assert.throws(() => harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'non-existent-div'), /Division not found/);
  });

  // --- Feature 10: Canonical Performer Selection ---
  test('F10-1: Manager updates entry roster with selected dancers', () => {
    const crew = harness.createCrew('ph', 'mgr-perf', 'Performers Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const selected = [
      { uid: 'd1', name: 'Dancer 1', role: 'Dancer', is_minor: false },
      { uid: 'd2', name: 'Dancer 2', role: 'Dancer', is_minor: false },
    ];
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, selected);
    assert.equal(updated.roster.length, 2);
    assert.equal(updated.roster[0].uid, 'd1');
  });

  test('F10-2: Performer selection preserves canonical consent status', () => {
    const crew = harness.createCrew('ph', 'mgr-perf-2', 'Consent Preserved Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-perf-2');
    harness.redeemInvitation('ph', inv.token, 'minor-fake', 'Minor Fake', true);
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    // Attempt to forge consent_verified: true in payload
    const forgedSelection = [
      { uid: 'minor-fake', name: 'Minor Fake', role: 'Dancer', is_minor: true, consent_verified: true },
    ];
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, forgedSelection);
    assert.equal(updated.roster[0].consent_verified, false, 'Forged consent must be overridden by canonical status');
  });

  test('F10-3: Duplicate dancer in roster update fails with 400', () => {
    const crew = harness.createCrew('ph', 'mgr-perf-3', 'Dup Roster Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const dupSelection = [
      { uid: 'd-dup', name: 'Dancer Dup', role: 'Dancer', is_minor: false },
      { uid: 'd-dup', name: 'Dancer Dup', role: 'Dancer', is_minor: false },
    ];
    assert.throws(() => harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, dupSelection), /Duplicate dancer in roster/);
  });

  test('F10-4: Roster update increments entry revision', () => {
    const crew = harness.createCrew('ph', 'mgr-perf-4', 'Rev Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const initialRev = entry.revision;
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, [{ uid: 'd10', name: 'D10', role: 'Dancer', is_minor: false }]);
    assert.equal(updated.revision, initialRev + 1);
  });

  test('F10-5: Cannot update roster of an approved entry', () => {
    const crew = harness.createCrew('ph', 'mgr-perf-5', 'Approved Immutable Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'approved';
    assert.throws(() => harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, [{ uid: 'd1', name: 'D1', role: 'Dancer', is_minor: false }]), /Cannot edit roster of approved entry/);
  });
});
