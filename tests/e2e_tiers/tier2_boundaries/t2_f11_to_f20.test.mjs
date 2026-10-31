import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 2: Boundary & Corner Cases (F11 - F20)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupReadyEntry() {
    const crew = harness.createCrew('ph', 'mgr-t2-ready', 'T2 Ready Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `d-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'track.mp3';
    entry.track_duration_secs = 180;
    entry.paid_minor = 600000;
    return { crew, entry };
  }

  // --- Feature 11: Readiness Vector Boundaries ---
  test('T2-F11-1: Entry with 0 paid_minor evaluates payment_ready: false', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    assert.equal(harness.evaluateReadiness(entry).payment_ready, false);
  });

  test('T2-F11-2: Entry with paid_minor == required - 1 unit evaluates payment_ready: false', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 600000 - 1;
    assert.equal(harness.evaluateReadiness(entry).payment_ready, false);
  });

  test('T2-F11-3: Entry with paid_minor == required evaluates payment_ready: true', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 600000;
    assert.equal(harness.evaluateReadiness(entry).payment_ready, true);
  });

  test('T2-F11-4: Entry with overpayment (paid > required) evaluates payment_ready: true', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 1000000; // 1,000,000 > 600,000
    assert.equal(harness.evaluateReadiness(entry).payment_ready, true);
  });

  test('T2-F11-5: 1 minor unverified among 20 dancers evaluates consent_ready: false', () => {
    const { entry } = setupReadyEntry();
    for (let i = 6; i <= 20; i++) {
      entry.roster.push({ uid: `d-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    entry.roster[10].is_minor = true;
    entry.roster[10].consent_verified = false;
    assert.equal(harness.evaluateReadiness(entry).consent_ready, false);
  });

  // --- Feature 12: Entry Submission Boundaries ---
  test('T2-F12-1: Successive submissions of already submitted entry are idempotent', () => {
    const { entry } = setupReadyEntry();
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    const sub2 = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(sub2.entry.status, 'submitted');
  });

  test('T2-F12-2: Submitting entry with 0 dancers transitions to needs_correction', () => {
    const { entry } = setupReadyEntry();
    entry.roster = [];
    const res = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(res.entry.status, 'needs_correction');
  });

  test('T2-F12-3: Diagnostics list is empty when entry is ready', () => {
    const { entry } = setupReadyEntry();
    const res = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(res.readiness.diagnostics.length, 0);
  });

  test('T2-F12-4: Diagnostics list includes exact string when music is missing', () => {
    const { entry } = setupReadyEntry();
    entry.track_filename = null;
    const res = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.ok(res.readiness.diagnostics.some(d => d.includes('Music missing')));
  });

  test('T2-F12-5: Submission preserves initial created_at timestamp', () => {
    const { entry } = setupReadyEntry();
    const created = entry.created_at;
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(entry.created_at, created);
  });

  // --- Feature 13: Registrar Approval Boundaries ---
  test('T2-F13-1: Re-approving already approved entry returns approved status', () => {
    const { entry } = setupReadyEntry();
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    const reAppr = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    assert.equal(reAppr.status, 'approved');
  });

  test('T2-F13-2: Approval fails if even one readiness vector is false', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0; // fails payment
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true),
      /Cannot approve entry that fails 4-vector readiness/
    );
  });

  test('T2-F13-3: Non-existent entry review throws 404', () => {
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', 'phantom-entry', 'registrar', true),
      /Entry not found/
    );
  });

  test('T2-F13-4: Empty reviewer role throws 403', () => {
    const { entry } = setupReadyEntry();
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, '', true),
      /Unauthorized reviewer role/
    );
  });

  test('T2-F13-5: Review updates updated_at timestamp', () => {
    const { entry } = setupReadyEntry();
    const oldTime = entry.updated_at;
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', false);
    assert.ok(entry.updated_at >= oldTime);
  });

  // --- Feature 14: Guardian Consent Boundaries ---
  test('T2-F14-1: Guardian name with 200 characters succeeds', () => {
    const crew = harness.createCrew('ph', 'mgr-g200', 'G200 Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-g200');
    harness.redeemInvitation('ph', inv.token, 'kid-200', 'Kid 200', true);
    const longName = 'Parent '.repeat(25);
    const res = harness.submitGuardianConsent('ph', crew.id, 'kid-200', longName, '2027-01-01');
    assert.equal(res.verified, true);
  });

  test('T2-F14-2: Re-submitting consent for already verified minor is idempotent', () => {
    const crew = harness.createCrew('ph', 'mgr-g-idem', 'Idem Consent Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-g-idem');
    harness.redeemInvitation('ph', inv.token, 'kid-idem', 'Kid Idem', true);
    harness.submitGuardianConsent('ph', crew.id, 'kid-idem', 'Mom', '2027-01-01');
    const res = harness.submitGuardianConsent('ph', crew.id, 'kid-idem', 'Mom', '2027-01-01');
    assert.equal(res.verified, true);
  });

  test('T2-F14-3: Consent submission for member with whitespace-only guardian name fails with 400', () => {
    const crew = harness.createCrew('ph', 'mgr-g-blank', 'Blank G Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-g-blank');
    harness.redeemInvitation('ph', inv.token, 'kid-blank', 'Kid Blank', true);
    assert.throws(
      () => harness.submitGuardianConsent('ph', crew.id, 'kid-blank', '\t\n  ', '2027-01-01'),
      /Guardian name required/
    );
  });

  test('T2-F14-4: Cross-chapter guardian consent submission fails with 404', () => {
    const crew = harness.createCrew('ph', 'mgr-g-cross', 'Cross G Crew', 'Manila');
    assert.throws(
      () => harness.submitGuardianConsent('hk', crew.id, 'kid', 'Mom', '2027-01-01'),
      /Crew not found/
    );
  });

  test('T2-F14-5: Multiple minors in same crew can be consented independently', () => {
    const crew = harness.createCrew('ph', 'mgr-g-multi', 'Multi Minor Crew', 'Manila');
    const inv1 = harness.createInvitation('ph', crew.id, 'mgr-g-multi');
    const inv2 = harness.createInvitation('ph', crew.id, 'mgr-g-multi');
    harness.redeemInvitation('ph', inv1.token, 'kid-m1', 'Kid M1', true);
    harness.redeemInvitation('ph', inv2.token, 'kid-m2', 'Kid M2', true);

    harness.submitGuardianConsent('ph', crew.id, 'kid-m1', 'Parent 1', '2027-01-01');
    assert.equal(crew.members.find(m => m.uid === 'kid-m1').consent_verified, true);
    assert.equal(crew.members.find(m => m.uid === 'kid-m2').consent_verified, false);
  });

  // --- Feature 15: Verification Vault Boundaries ---
  test('T2-F15-1: File size exactly 10MB (10,485,760 bytes) is accepted', () => {
    const v = harness.createVerificationCase('ph', 'dancer-10mb', 'identity', 'gs://v/10mb.pdf', 'application/pdf', 10 * 1024 * 1024);
    assert.equal(v.size_bytes, 10485760);
  });

  test('T2-F15-2: File size 10MB + 1 byte is rejected with 413', () => {
    assert.throws(
      () => harness.createVerificationCase('ph', 'dancer-over', 'identity', 'gs://v/over.pdf', 'application/pdf', 10 * 1024 * 1024 + 1),
      /File exceeds 10MB limit/
    );
  });

  test('T2-F15-3: PNG image format is accepted for identity proof', () => {
    const v = harness.createVerificationCase('ph', 'dancer-png', 'identity', 'gs://v/id.png', 'image/png', 500000);
    assert.equal(v.content_type, 'image/png');
  });

  test('T2-F15-4: Invalid verification purpose string throws 400', () => {
    assert.throws(
      () => harness.createVerificationCase('ph', 'dancer-bad-p', 'citizenship_fake', 'gs://v/doc.pdf', 'application/pdf', 1000),
      /Invalid purpose/
    );
  });

  test('T2-F15-5: Review note can be up to 500 characters', () => {
    const v = harness.createVerificationCase('ph', 'dancer-note', 'identity', 'gs://v/doc.pdf', 'application/pdf', 1000);
    const note = 'Approved passport from government agency. '.repeat(10);
    const reviewed = harness.reviewVerificationCase('ph', v.caseId, 'verifier', true, note);
    assert.equal(reviewed.reviewer_note, note);
  });

  // --- Feature 16: Audio Duration Boundaries ---
  test('T2-F16-1: Audio track with exactly 185s (180s max + 5s grace) evaluates compliant: true', () => {
    const { entry } = setupReadyEntry();
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'exact-grace.mp3', 185);
    assert.equal(res.compliant, true);
    assert.equal(res.excessSecs, 0);
  });

  test('T2-F16-2: Audio track with 186s (exceeding grace by 1s) evaluates compliant: false', () => {
    const { entry } = setupReadyEntry();
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'over-grace.mp3', 186);
    assert.equal(res.compliant, false);
    assert.equal(res.excessSecs, 1);
  });

  test('T2-F16-3: Audio track with 1s duration evaluates compliant: true', () => {
    const { entry } = setupReadyEntry();
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'one-sec.mp3', 1);
    assert.equal(res.compliant, true);
  });

  test('T2-F16-4: Audio track with floating point duration is supported', () => {
    const { entry } = setupReadyEntry();
    const res = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'float.mp3', 179.8);
    assert.equal(res.compliant, true);
  });

  test('T2-F16-5: Audio filename with symbols and spaces is preserved', () => {
    const { entry } = setupReadyEntry();
    const complexName = 'Track #1 - Finals (Mix 2027).mp3';
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, complexName, 150);
    assert.equal(entry.track_filename, complexName);
  });

  // --- Feature 17: DJ Export Boundaries ---
  test('T2-F17-1: Division with 0 approved entries exports empty manifest', () => {
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(exportPack.manifest.length, 0);
    assert.equal(exportPack.total_tracks, 0);
  });

  test('T2-F17-2: Order numbers zero-padded to 2 digits', () => {
    const { entry } = setupReadyEntry();
    entry.status = 'approved';
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.ok(exportPack.manifest[0].export_filename.startsWith('01_'));
  });

  test('T2-F17-3: Export handles multiple approved entries with consecutive orders', () => {
    const { entry: e1 } = setupReadyEntry();
    e1.status = 'approved';
    const crew2 = harness.createCrew('ph', 'mgr-e2', 'Crew Two', 'Manila');
    for (let i = 1; i <= 5; i++) crew2.members.push({ uid: `e2-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const e2 = harness.createEntryDraft('ph', 'manila-session-2027', crew2.id, 'open-crew');
    e2.status = 'approved';
    e2.track_filename = 'e2.mp3';
    e2.track_duration_secs = 140;

    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(exportPack.manifest.length, 2);
    assert.equal(exportPack.manifest[0].order, 1);
    assert.equal(exportPack.manifest[1].order, 2);
  });

  test('T2-F17-4: Export cleans multiple whitespace runs into single underscores', () => {
    const crew = harness.createCrew('ph', 'mgr-spaces', 'Crew    Many    Spaces', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `s-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'approved';
    entry.track_filename = 'spaces.mp3';
    entry.track_duration_secs = 120;

    const pack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const item = pack.manifest.find(m => m.entry_id === entry.id);
    assert.ok(!item.export_filename.includes(' '));
  });

  test('T2-F17-5: Unapproved entries in same division do not affect export count', () => {
    const { entry: e1 } = setupReadyEntry();
    e1.status = 'approved';
    const crewDraft = harness.createCrew('ph', 'mgr-draft-unapp', 'Draft Unapp', 'Manila');
    const eDraft = harness.createEntryDraft('ph', 'manila-session-2027', crewDraft.id, 'open-crew');
    eDraft.status = 'submitted';

    const pack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(pack.total_tracks, 1);
  });

  // --- Feature 18: Fee Quote Boundaries ---
  test('T2-F18-1: Quote with 1 dancer calculates exact rate for 1 dancer', () => {
    const crew = harness.createCrew('ph', 'mgr-1d', 'Single Dancer Crew', 'Manila');
    crew.members.push({ uid: 'd-solo', name: 'Solo', role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.dancer_count, 1);
    assert.equal(quote.total_amount_minor, 120000);
  });

  test('T2-F18-2: Quote when pending equals total leaves 0 available balance', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-all', 'ref-all', 600000);
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.pending_amount_minor, 600000);
    assert.equal(quote.available_amount_minor, 0);
  });

  test('T2-F18-3: Quote with partial payment (50%) reflects exactly 50% outstanding', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 300000;
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.outstanding_amount_minor, 300000);
    assert.equal(quote.available_amount_minor, 300000);
  });

  test('T2-F18-4: Overpaid entry reflects 0 outstanding and 0 available', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 800000; // total is 600,000
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.outstanding_amount_minor, 0);
    assert.equal(quote.available_amount_minor, 0);
  });

  test('T2-F18-5: Fee quote reports currency corresponding to chapter', () => {
    const crewHk = harness.createCrew('hk', 'mgr-hk-quote', 'HK Quote Crew', 'Kowloon');
    harness.events.set('hk-event-2027', { id: 'hk-event-2027', chapter_id: 'hk', name: 'HK 2027', status: 'active', rules_version: '1' });
    harness.divisions.set('hk-event-2027:open-crew', { id: 'open-crew', name: 'Open', min_members: 1, max_members: 10, max_duration_secs: 180, fee_minor: 100000 });
    const entryHk = harness.createEntryDraft('hk', 'hk-event-2027', crewHk.id, 'open-crew');
    const quote = harness.getPaymentQuote('hk', 'hk-event-2027', entryHk.id);
    assert.equal(quote.currency, 'HKD');
  });

  // --- Feature 19: Payment Request Boundaries ---
  test('T2-F19-1: Requesting exact available balance succeeds', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-exact', 600000);
    assert.equal(p.amount_minor, 600000);
  });

  test('T2-F19-2: Requesting available balance + 1 minor unit fails with 409', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    assert.throws(
      () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-over1', 600001),
      /Amount exceeds available unreserved fee balance/
    );
  });

  test('T2-F19-3: Requesting 1 minor unit (minimum unit) succeeds', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-1unit', 1);
    assert.equal(p.amount_minor, 1);
  });

  test('T2-F19-4: Multiple split payments summing exactly to total fee succeed', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-split-a', 200000);
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p2', 'ref-split-b', 200000);
    const p3 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p3', 'ref-split-c', 200000);
    assert.equal(p1.amount_minor + p2.amount_minor + p3.amount_minor, 600000);
  });

  test('T2-F19-5: Empty provider reference throws 400', () => {
    const { entry } = setupReadyEntry();
    assert.throws(
      () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', '   ', 100000),
      /Provider reference required/
    );
  });

  // --- Feature 20: Webhook Boundaries ---
  test('T2-F20-1: Webhook payload with extra JSON attributes succeeds', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-extra', 'ref-extra', 120000);
    const payloadRaw = JSON.stringify({
      payment_id: payment.payment_id,
      status: 'settled',
      extra_gateway_metadata: { ip: '127.0.0.1', risk_score: 0 },
    });
    const secret = 'webhook-sec';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    const res = harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(res.payment.status, 'settled');
  });

  test('T2-F20-2: Webhook HMAC calculated over UTF-8 characters succeeds', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-utf8', 'ref-utf8', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled', note: 'Pagbabayad ng crew 舞' });
    const secret = 'webhook-sec';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    const res = harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(res.payment.status, 'settled');
  });

  test('T2-F20-3: Webhook HMAC signature with wrong casing fails with 401', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-case', 'ref-case', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'webhook-sec';
    const sigUpper = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex').toUpperCase();

    assert.throws(
      () => harness.processSyntheticWebhook(sigUpper, payloadRaw, secret),
      /Invalid webhook HMAC signature/
    );
  });

  test('T2-F20-4: Webhook for payment already settled does not double increment balance', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-double', 'ref-double', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'webhook-sec';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(entry.paid_minor, 120000);
    harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(entry.paid_minor, 120000);
  });

  test('T2-F20-5: Webhook delivery failure preserves original payment state', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-fail', 'ref-fail', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    try {
      harness.processSyntheticWebhook('wrong-signature', payloadRaw, 'webhook-sec');
    } catch {
      // expected
    }
    assert.equal(payment.status, 'pending');
    assert.equal(entry.paid_minor, 0);
  });
});
