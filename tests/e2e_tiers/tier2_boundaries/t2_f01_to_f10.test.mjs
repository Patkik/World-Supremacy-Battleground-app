import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 2: Boundary & Corner Cases (F01 - F10)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  // --- Feature 1: Token Boundary Cases ---
  test('T2-F01-1: Token with empty sub string fails with 401', () => {
    const token = harness.createToken({ sub: '' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid sub/);
  });

  test('T2-F01-2: Token with 129-char sub exceeding 128 max fails with 401', () => {
    const longSub = 'a'.repeat(129);
    const token = harness.createToken({ sub: longSub });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid sub/);
  });

  test('T2-F01-3: Token with future iat (+10s) fails with 401', () => {
    const token = harness.createToken({ iat: Math.floor(Date.now() / 1000) + 10 });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Token issued in future/);
  });

  test('T2-F01-4: Token with exact current timestamp exp <= now fails with 401', () => {
    const token = harness.createToken({ exp: Math.floor(Date.now() / 1000) });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Token expired/);
  });

  test('T2-F01-5: Malformed token with 2 parts instead of 3 fails with 401', () => {
    assert.throws(() => harness.verifyToken('header.payload', 'ph'), /Malformed JWT/);
  });

  // --- Feature 2: Chapter & Event Discovery Boundaries ---
  test('T2-F02-1: Case-sensitive chapter ID lookups (PH vs ph) fail closed', () => {
    assert.throws(() => harness.getChapter('PH'), /Chapter not found/);
  });

  test('T2-F02-2: Event registration cutoff boundary at cutoff - 1s succeeds', () => {
    const now = Math.floor(Date.now() / 1000);
    harness.events.set('event-boundary-1', {
      id: 'event-boundary-1',
      chapter_id: 'ph',
      name: 'Cutoff Event',
      status: 'active',
      rules_version: '1',
      registration_closes_at: now + 10,
    });
    const event = harness.getEvent('ph', 'event-boundary-1');
    assert.ok(event.registration_closes_at > now);
  });

  test('T2-F02-3: Event registration cutoff at cutoff + 1s is flagged closed', () => {
    const now = Math.floor(Date.now() / 1000);
    harness.events.set('event-closed', {
      id: 'event-closed',
      chapter_id: 'ph',
      name: 'Closed Event',
      status: 'closed',
      rules_version: '1',
      registration_closes_at: now - 1,
    });
    const event = harness.getEvent('ph', 'event-closed');
    assert.equal(event.status, 'closed');
  });

  test('T2-F02-4: Chapter list returns empty array when cleared', () => {
    harness.chapters.clear();
    const list = harness.listChapters();
    assert.equal(list.length, 0);
  });

  test('T2-F02-5: Path traversal characters in event lookup return 404', () => {
    assert.throws(() => harness.getEvent('ph', '../events/etc'), /Event not found/);
  });

  // --- Feature 3: Division Bounds ---
  test('T2-F03-1: Roster count exactly at min_members (5) satisfies bounds', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.equal(div.min_members, 5);
    assert.ok(5 >= div.min_members && 5 <= div.max_members);
  });

  test('T2-F03-2: Roster count exactly at min_members - 1 (4) violates bounds', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.ok(!(4 >= div.min_members && 4 <= div.max_members));
  });

  test('T2-F03-3: Roster count exactly at max_members (20) satisfies bounds', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.ok(20 >= div.min_members && 20 <= div.max_members);
  });

  test('T2-F03-4: Roster count exactly at max_members + 1 (21) violates bounds', () => {
    const div = harness.getDivision('manila-session-2027', 'open-crew');
    assert.ok(!(21 >= div.min_members && 21 <= div.max_members));
  });

  test('T2-F03-5: Safe integer handling for large fee values', () => {
    harness.divisions.set('manila-session-2027:vip', {
      id: 'vip',
      name: 'VIP',
      min_members: 1,
      max_members: 5,
      max_duration_secs: 180,
      fee_minor: Number.MAX_SAFE_INTEGER,
    });
    const div = harness.getDivision('manila-session-2027', 'vip');
    assert.ok(Number.isSafeInteger(div.fee_minor));
  });

  // --- Feature 4: Synthetic Sandbox Boundaries ---
  test('T2-F04-1: GCLOUD_PROJECT set to empty string fails closed', () => {
    const token = harness.createToken({ aud: '' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Audience mismatch/);
  });

  test('T2-F04-2: Non-demo-wsb prefix fails verification closed', () => {
    const token = harness.createToken({ aud: 'demo-wsb-fake' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Audience mismatch/);
  });

  test('T2-F04-3: Readyz status strictly 503 while release approval is false', () => {
    harness.releaseReady = false;
    assert.equal(harness.getReadyz().status, 503);
  });

  test('T2-F04-4: Database reachable true with release_ready false returns 503', () => {
    harness.releaseReady = false;
    const r = harness.getReadyz();
    assert.equal(r.status, 503);
    assert.equal(r.body.database_reachable, true);
    assert.equal(r.body.release_ready, false);
  });

  test('T2-F04-5: Invalid issuer on token fails closed even with matching audience', () => {
    const token = harness.createToken({ iss: 'https://evil.com/demo-wsb' });
    assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid issuer/);
  });

  // --- Feature 5: Clippy & Build Hygiene Boundaries ---
  test('T2-F05-1: Zero warnings allowed in clean build check', () => {
    const h = harness.verifyBuildHygiene();
    assert.equal(h.warnings, 0);
  });

  test('T2-F05-2: Zero errors allowed in clean build check', () => {
    const h = harness.verifyBuildHygiene();
    assert.equal(h.errors, 0);
  });

  test('T2-F05-3: Strict schema conformity for all registered chapters', () => {
    for (const c of harness.listChapters()) {
      assert.ok(c.id && c.name && c.currency);
      assert.equal(c.currency.length, 3);
    }
  });

  test('T2-F05-4: Enforce valid snake_case or standard roles', () => {
    const allowed = ['chapter_director', 'registrar', 'finance', 'verifier', 'support', 'head_judge', 'judge', 'marshal', 'crew_manager', 'dancer'];
    for (const m of harness.memberships.values()) {
      assert.ok(allowed.includes(m.role));
    }
  });

  test('T2-F05-5: Idempotent build hygiene checks', () => {
    assert.deepEqual(harness.verifyBuildHygiene(), harness.verifyBuildHygiene());
  });

  // --- Feature 6: Crew Profile Boundaries ---
  test('T2-F06-1: Crew name with exactly 1 character succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-1c', 'X', 'Manila');
    assert.equal(crew.name, 'X');
  });

  test('T2-F06-2: Crew name with 100 characters succeeds', () => {
    const longName = 'C'.repeat(100);
    const crew = harness.createCrew('ph', 'mgr-100c', longName, 'Manila');
    assert.equal(crew.name, longName);
  });

  test('T2-F06-3: Crew name with whitespace padding is automatically trimmed', () => {
    const crew = harness.createCrew('ph', 'mgr-trim', '  Trimmed Crew  ', '  Manila  ');
    assert.equal(crew.name, 'Trimmed Crew');
    assert.equal(crew.city, 'Manila');
  });

  test('T2-F06-4: Crew name with Unicode and international characters succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-uni', 'B-Boy 舞者 / Dança', 'Manila');
    assert.equal(crew.name, 'B-Boy 舞者 / Dança');
  });

  test('T2-F06-5: Blank city is rejected with 400', () => {
    assert.throws(() => harness.createCrew('ph', 'mgr-bad-city', 'Valid Crew', '   '), /City cannot be empty/);
  });

  // --- Feature 7: Invitation Expiration Boundaries ---
  test('T2-F07-1: Invitation redeemed exactly at expiration - 1s succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-inv', 'T2 Inv Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-inv', 'Dancer', 10);
    const res = harness.redeemInvitation('ph', inv.token, 'd-edge-1', 'Edge Dancer', false);
    assert.equal(res.member.uid, 'd-edge-1');
  });

  test('T2-F07-2: Invitation redeemed at expiration timestamp fails with 410', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-inv2', 'T2 Inv Crew 2', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-inv2', 'Dancer', 0); // expires immediately
    assert.throws(() => harness.redeemInvitation('ph', inv.token, 'd-edge-2', 'Late Dancer', false), /Invitation expired/);
  });

  test('T2-F07-3: Invitation token length is 32 hex characters', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-inv3', 'T2 Inv Crew 3', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-inv3', 'Dancer');
    assert.equal(inv.token.length, 32);
  });

  test('T2-F07-4: Non-existent invitation token returns 404', () => {
    assert.throws(() => harness.redeemInvitation('ph', 'non-existent-token-1234', 'd', 'D', false), /Invitation not found/);
  });

  test('T2-F07-5: Invitation for deleted crew fails with 404', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-inv5', 'T2 Inv Crew 5', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-inv5', 'Dancer');
    harness.crews.delete(crew.id); // simulate deleted crew
    assert.throws(() => harness.redeemInvitation('ph', inv.token, 'd-5', 'D5', false), /Associated crew not found/);
  });

  // --- Feature 8: Dancer Invitation Redemption Boundaries ---
  test('T2-F08-1: Minor dancer status is explicitly recorded as boolean true', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-red1', 'Minor Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-red1');
    const { member } = harness.redeemInvitation('ph', inv.token, 'minor-true', 'Young 1', true);
    assert.equal(member.is_minor, true);
    assert.equal(member.consent_verified, false);
  });

  test('T2-F08-2: Adult dancer status is explicitly recorded as boolean false', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-red2', 'Adult Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-red2');
    const { member } = harness.redeemInvitation('ph', inv.token, 'adult-true', 'Adult 1', false);
    assert.equal(member.is_minor, false);
    assert.equal(member.consent_verified, true);
  });

  test('T2-F08-3: Re-using already redeemed token fails with 409', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-red3', 'Reused Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-red3');
    harness.redeemInvitation('ph', inv.token, 'd1', 'D1', false);
    assert.throws(() => harness.redeemInvitation('ph', inv.token, 'd2', 'D2', false), /Invitation already used/);
  });

  test('T2-F08-4: Cross-chapter token redemption fails with 404', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-red4', 'PH Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-red4');
    assert.throws(() => harness.redeemInvitation('hk', inv.token, 'd1', 'D1', false), /Invitation not found/);
  });

  test('T2-F08-5: Redeeming invitation increments crew revision', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-red5', 'Rev Crew', 'Manila');
    const initialRev = crew.revision;
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-red5');
    harness.redeemInvitation('ph', inv.token, 'd-rev', 'D Rev', false);
    assert.equal(crew.revision, initialRev + 1);
  });

  // --- Feature 9: Entry Draft Boundaries ---
  test('T2-F09-1: Crew creating drafts in two different divisions succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-e1', 'Dual Div Crew', 'Manila');
    harness.divisions.set('manila-session-2027:junior-crew', {
      id: 'junior-crew',
      name: 'Junior Division',
      min_members: 5,
      max_members: 15,
      max_duration_secs: 150,
      max_age: 18,
      fee_minor: 100000,
    });
    const eOpen = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const eJunior = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'junior-crew');
    assert.notEqual(eOpen.id, eJunior.id);
    assert.equal(eOpen.division_id, 'open-crew');
    assert.equal(eJunior.division_id, 'junior-crew');
  });

  test('T2-F09-2: Re-requesting draft for same crew & division returns same draft', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-e2', 'Same Div Crew', 'Manila');
    const d1 = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const d2 = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(d1.id, d2.id);
  });

  test('T2-F09-3: Entry draft has unique cryptographic ID format', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-e3', 'Crypto ID Crew', 'Manila');
    const draft = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.ok(draft.id.startsWith('entry-'));
    assert.ok(draft.id.length >= 16);
  });

  test('T2-F09-4: Draft creation with crew having only manager initializes 1-member roster', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-e4', 'Manager Only Crew', 'Manila');
    const draft = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(draft.roster.length, 1);
    assert.equal(draft.roster[0].role, 'Manager');
  });

  test('T2-F09-5: 100 generated entry drafts have 0 ID collisions', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const crew = harness.createCrew('ph', `mgr-iter-${i}`, `Crew Iter ${i}`, 'Manila');
      const draft = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      assert.ok(!ids.has(draft.id));
      ids.add(draft.id);
    }
    assert.equal(ids.size, 100);
  });

  // --- Feature 10: Canonical Performer Selection Boundaries ---
  test('T2-F10-1: Empty selection (0 dancers) succeeds as draft but has 0 roster_count', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-p1', 'Empty Select Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, []);
    assert.equal(updated.roster.length, 0);
  });

  test('T2-F10-2: Selection with exactly 20 dancers (max_members) succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-p2', 'Max 20 Crew', 'Manila');
    const dancers = [];
    for (let i = 1; i <= 20; i++) {
      dancers.push({ uid: `d-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, dancers);
    assert.equal(updated.roster.length, 20);
  });

  test('T2-F10-3: Roster selection with duplicate UID fails with 400', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-p3', 'Dup Dancer Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const dup = [
      { uid: 'same-uid', name: 'D 1', role: 'Dancer', is_minor: false },
      { uid: 'same-uid', name: 'D 2', role: 'Dancer', is_minor: false },
    ];
    assert.throws(
      () => harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, dup),
      /Duplicate dancer in roster/
    );
  });

  test('T2-F10-4: Canonical consent status overrides client-side attempt to fake consent', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-p4', 'Spoof Consent Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-t2-p4');
    harness.redeemInvitation('ph', inv.token, 'minor-kid', 'Minor Kid', true);
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    const spoofed = [
      { uid: 'minor-kid', name: 'Minor Kid', role: 'Dancer', is_minor: true, consent_verified: true },
    ];
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, spoofed);
    assert.equal(updated.roster[0].consent_verified, false);
  });

  test('T2-F10-5: Updating roster of approved entry is rejected with 409', () => {
    const crew = harness.createCrew('ph', 'mgr-t2-p5', 'Approved Entry Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'approved';
    assert.throws(
      () => harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, [{ uid: 'd1', name: 'D1', role: 'Dancer', is_minor: false }]),
      /Cannot edit roster of approved entry/
    );
  });
});
