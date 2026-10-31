import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 1: Feature Coverage (F11 - F20)', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  function setupReadyEntry() {
    const crew = harness.createCrew('ph', 'mgr-ready', 'Ready Crew', 'Manila');
    // Add 5 adult dancers to meet min_members (5)
    for (let i = 1; i <= 5; i++) {
      crew.members.push({
        uid: `dancer-${i}`,
        name: `Dancer ${i}`,
        role: 'Dancer',
        is_minor: false,
        consent_verified: true,
      });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.roster = [...crew.members];
    entry.track_filename = 'routine.mp3';
    entry.track_duration_secs = 175; // limit 180 + 5 grace
    entry.paid_minor = 120000 * 5; // 600,000 minor units
    return { crew, entry };
  }

  // --- Feature 11: Computed 4-Vector Entry Readiness ---
  test('F11-1: Fully compliant entry evaluates to is_ready: true', () => {
    const { entry } = setupReadyEntry();
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.is_ready, true);
    assert.equal(readiness.roster_ready, true);
    assert.equal(readiness.music_ready, true);
    assert.equal(readiness.consent_ready, true);
    assert.equal(readiness.payment_ready, true);
    assert.equal(readiness.diagnostics.length, 0);
  });

  test('F11-2: Roster vector fails when dancer count is below division min_members', () => {
    const { entry } = setupReadyEntry();
    entry.roster = entry.roster.slice(0, 3); // 2 dancers only (below 5)
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.roster_ready, false);
    assert.equal(readiness.is_ready, false);
  });

  test('F11-3: Music vector fails when duration exceeds max allowed + 5s grace', () => {
    const { entry } = setupReadyEntry();
    entry.track_duration_secs = 186; // max 180 + 5 = 185
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.music_ready, false);
    assert.equal(readiness.is_ready, false);
  });

  test('F11-4: Consent vector fails when minor lacks verified guardian consent', () => {
    const { entry } = setupReadyEntry();
    entry.roster.push({
      uid: 'minor-unverified',
      name: 'Youngster',
      role: 'Dancer',
      is_minor: true,
      consent_verified: false,
    });
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.consent_ready, false);
    assert.equal(readiness.is_ready, false);
  });

  test('F11-5: Payment vector fails when paid amount is below required fee', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 100000; // required is 600,000
    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.payment_ready, false);
    assert.equal(readiness.is_ready, false);
  });

  // --- Feature 12: Entry Submission & Corrections ---
  test('F12-1: Submitting ready entry transitions status to submitted', () => {
    const { entry } = setupReadyEntry();
    const { entry: submitted, readiness } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(submitted.status, 'submitted');
    assert.equal(readiness.is_ready, true);
  });

  test('F12-2: Submitting incomplete entry transitions status to needs_correction', () => {
    const { entry } = setupReadyEntry();
    entry.track_filename = null; // missing music
    const { entry: submitted, readiness } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(submitted.status, 'needs_correction');
    assert.equal(readiness.is_ready, false);
  });

  test('F12-3: Submission response includes full diagnostics on correction', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const { readiness } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.ok(readiness.diagnostics.length > 0);
    assert.ok(readiness.diagnostics.some(d => d.includes('Payment insufficient')));
  });

  test('F12-4: Submission updates entry updated_at timestamp', () => {
    const { entry } = setupReadyEntry();
    const before = entry.updated_at;
    const { entry: submitted } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.ok(submitted.updated_at >= before);
  });

  test('F12-5: Re-submitting corrected entry transitions back to submitted', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(entry.status, 'needs_correction');
    entry.paid_minor = 600000;
    const { entry: resubmitted } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(resubmitted.status, 'submitted');
  });

  // --- Feature 13: Registrar Review & Approval ---
  test('F13-1: Registrar approves ready submitted entry', () => {
    const { entry } = setupReadyEntry();
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    const approved = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    assert.equal(approved.status, 'approved');
  });

  test('F13-2: Chapter Director can also approve ready entry', () => {
    const { entry } = setupReadyEntry();
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    const approved = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'chapter_director', true);
    assert.equal(approved.status, 'approved');
  });

  test('F13-3: Approving entry that fails readiness throws 400', () => {
    const { entry } = setupReadyEntry();
    entry.track_filename = null;
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true),
      /Cannot approve entry that fails 4-vector readiness/
    );
  });

  test('F13-4: Registrar rejection transitions status to needs_correction', () => {
    const { entry } = setupReadyEntry();
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    const rejected = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', false);
    assert.equal(rejected.status, 'needs_correction');
  });

  test('F13-5: Unauthorized staff role cannot review entry (403)', () => {
    const { entry } = setupReadyEntry();
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'judge', true),
      /Unauthorized reviewer role/
    );
  });

  // --- Feature 14: Guardian Consent & Minor Waivers ---
  test('F14-1: Valid guardian consent verifies minor dancer', () => {
    const crew = harness.createCrew('ph', 'mgr-waiver', 'Waiver Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-waiver');
    const { member } = harness.redeemInvitation('ph', inv.token, 'minor-10', 'Kid Dancer', true);
    assert.equal(member.consent_verified, false);

    const result = harness.submitGuardianConsent('ph', crew.id, 'minor-10', 'Parent Name', '2027-01-01');
    assert.equal(result.verified, true);
    assert.equal(member.consent_verified, true);
  });

  test('F14-2: Guardian consent immediately propagates to draft entries', () => {
    const crew = harness.createCrew('ph', 'mgr-waiver-2', 'Propagate Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-waiver-2');
    harness.redeemInvitation('ph', inv.token, 'minor-20', 'Kid 20', true);
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry.roster.find(m => m.uid === 'minor-20').consent_verified, false);

    harness.submitGuardianConsent('ph', crew.id, 'minor-20', 'Guardian Jane', '2027-01-02');
    assert.equal(entry.roster.find(m => m.uid === 'minor-20').consent_verified, true);
  });

  test('F14-3: Missing guardian name throws 400', () => {
    const crew = harness.createCrew('ph', 'mgr-waiver-3', 'Blank Name Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-waiver-3');
    harness.redeemInvitation('ph', inv.token, 'minor-30', 'Kid 30', true);
    assert.throws(
      () => harness.submitGuardianConsent('ph', crew.id, 'minor-30', '   ', '2027-01-02'),
      /Guardian name required/
    );
  });

  test('F14-4: Consent submission for adult throws 400', () => {
    const crew = harness.createCrew('ph', 'mgr-waiver-4', 'Adult Crew', 'Manila');
    assert.throws(
      () => harness.submitGuardianConsent('ph', crew.id, 'mgr-waiver-4', 'Parent', '2027-01-02'),
      /Member is not a minor/
    );
  });

  test('F14-5: Consent submission for non-existent minor throws 404', () => {
    const crew = harness.createCrew('ph', 'mgr-waiver-5', 'Missing Kid Crew', 'Manila');
    assert.throws(
      () => harness.submitGuardianConsent('ph', crew.id, 'phantom-kid', 'Parent', '2027-01-02'),
      /Minor not found/
    );
  });

  // --- Feature 15: Identity Evidence Vault & Storage ---
  test('F15-1: Create identity verification case with PDF metadata', () => {
    const verif = harness.createVerificationCase('ph', 'dancer-doc-1', 'identity', 'gs://vault/doc1.pdf', 'application/pdf', 1024 * 500);
    assert.equal(verif.status, 'pending');
    assert.equal(verif.content_type, 'application/pdf');
    assert.equal(verif.size_bytes, 512000);
  });

  test('F15-2: Create residency verification case with JPEG format', () => {
    const verif = harness.createVerificationCase('ph', 'dancer-doc-2', 'residency', 'gs://vault/doc2.jpg', 'image/jpeg', 1024 * 800);
    assert.equal(verif.purpose, 'residency');
    assert.equal(verif.content_type, 'image/jpeg');
  });

  test('F15-3: Reject file exceeding 10MB limit with 413', () => {
    assert.throws(
      () => harness.createVerificationCase('ph', 'dancer-big', 'identity', 'gs://vault/big.pdf', 'application/pdf', 11 * 1024 * 1024),
      /File exceeds 10MB limit/
    );
  });

  test('F15-4: Reject unsupported file format with 400', () => {
    assert.throws(
      () => harness.createVerificationCase('ph', 'dancer-bad', 'identity', 'gs://vault/bad.exe', 'application/x-msdownload', 1024),
      /Unsupported file format/
    );
  });

  test('F15-5: Authorized verifier approves verification case', () => {
    const verif = harness.createVerificationCase('ph', 'dancer-appr', 'identity', 'gs://vault/valid.pdf', 'application/pdf', 2048);
    const reviewed = harness.reviewVerificationCase('ph', verif.caseId, 'verifier', true, 'Valid passport');
    assert.equal(reviewed.status, 'approved');
    assert.equal(reviewed.reviewer_note, 'Valid passport');
  });

  // --- Feature 16: Audio Upload & Duration Compliance ---
  test('F16-1: Performance audio within exact duration limit evaluates compliant: true', () => {
    const { entry } = setupReadyEntry();
    const result = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine.mp3', 180);
    assert.equal(result.compliant, true);
    assert.equal(result.excessSecs, 0);
  });

  test('F16-2: Performance audio within 5s grace period evaluates compliant: true', () => {
    const { entry } = setupReadyEntry();
    const result = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine-grace.mp3', 185); // 180 + 5
    assert.equal(result.compliant, true);
    assert.equal(result.excessSecs, 0);
  });

  test('F16-3: Performance audio exceeding 5s grace evaluates compliant: false', () => {
    const { entry } = setupReadyEntry();
    const result = harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine-long.mp3', 190);
    assert.equal(result.compliant, false);
    assert.equal(result.excessSecs, 5);
  });

  test('F16-4: Audio upload with 0 or negative duration is rejected with 400', () => {
    const { entry } = setupReadyEntry();
    assert.throws(
      () => harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'zero.mp3', 0),
      /Duration must be positive/
    );
  });

  test('F16-5: Uploading audio updates entry track_filename and track_duration_secs', () => {
    const { entry } = setupReadyEntry();
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'track-final.mp3', 160);
    assert.equal(entry.track_filename, 'track-final.mp3');
    assert.equal(entry.track_duration_secs, 160);
  });

  // --- Feature 17: DJ Playlist Auto-Renaming & Export ---
  test('F17-1: Export playlist generates formatted filenames [Order]_[Division]_[Crew].mp3', () => {
    const { entry, crew } = setupReadyEntry();
    entry.status = 'approved';
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.ok(exportPack.manifest.length >= 1);
    const item = exportPack.manifest.find(m => m.entry_id === entry.id);
    assert.equal(item.export_filename, `01_open-crew_${crew.name.replace(/\s+/g, '_')}.mp3`);
  });

  test('F17-2: Filenames sanitize special characters to underscores', () => {
    const crew = harness.createCrew('ph', 'mgr-spec', 'Crew & Co. / Test', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `sp-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'approved';
    entry.track_filename = 'raw.mp3';
    entry.track_duration_secs = 150;
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const item = exportPack.manifest.find(m => m.entry_id === entry.id);
    assert.ok(!item.export_filename.includes('&'));
    assert.ok(!item.export_filename.includes('/'));
  });

  test('F17-3: DJ export manifest includes accurate track duration', () => {
    const { entry } = setupReadyEntry();
    entry.status = 'approved';
    entry.track_duration_secs = 172;
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    const item = exportPack.manifest.find(m => m.entry_id === entry.id);
    assert.equal(item.duration_secs, 172);
  });

  test('F17-4: Non-approved entries are omitted from DJ playlist export', () => {
    const crew = harness.createCrew('ph', 'mgr-draft-only', 'Draft Only Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.status = 'draft';
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.ok(!exportPack.manifest.some(m => m.entry_id === entry.id));
  });

  test('F17-5: DJ export reports total tracks count accurately', () => {
    const exportPack = harness.exportDJPlaylist('ph', 'manila-session-2027', 'open-crew');
    assert.equal(exportPack.total_tracks, exportPack.manifest.length);
  });

  // --- Feature 18: Fee Quote Generation ---
  test('F18-1: Fee quote calculates total based on dancer count * division rate', () => {
    const { entry } = setupReadyEntry();
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.dancer_count, 5);
    assert.equal(quote.rate_per_dancer_minor, 120000);
    assert.equal(quote.total_amount_minor, 600000);
  });

  test('F18-2: Fee quote reports currency from chapter config', () => {
    const { entry } = setupReadyEntry();
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.currency, 'PHP');
  });

  test('F18-3: Fee quote outstanding reflects paid amounts', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 240000;
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.outstanding_amount_minor, 360000);
  });

  test('F18-4: Fee quote pending amount reflects unconfirmed payment reservations', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-pending-1', 120000);
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.pending_amount_minor, 120000);
    assert.equal(quote.available_amount_minor, 480000);
  });

  test('F18-5: Zero dancers in roster yields zero total fee', () => {
    const crew = harness.createCrew('ph', 'mgr-zero', 'Zero Dancers Crew', 'Manila');
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.roster = [];
    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.dancer_count, 0);
    assert.equal(quote.total_amount_minor, 0);
  });

  // --- Feature 19: Payment Request & Split Share ---
  test('F19-1: Manager requests payment successfully', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-split-1', 'ref-split-1', 120000);
    assert.equal(payment.status, 'pending');
    assert.equal(payment.amount_minor, 120000);
  });

  test('F19-2: Duplicate payment request with identical reference is idempotent', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-split-2', 'ref-split-2', 120000);
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-split-2', 'ref-split-2', 120000);
    assert.equal(p1.payment_id, p2.payment_id);
  });

  test('F19-3: Payment request with changed amount for same reference fails with 409', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-split-3', 'ref-split-3', 120000);
    assert.throws(
      () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-split-3', 'ref-split-3', 240000),
      /Provider reference already used with different amount/
    );
  });

  test('F19-4: Payment request exceeding available balance fails with 409', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    // Total is 600,000; attempting to reserve 700,000
    assert.throws(
      () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-over', 'ref-over', 700000),
      /Amount exceeds available unreserved fee balance/
    );
  });

  test('F19-5: Zero or negative amount payment request fails with 400', () => {
    const { entry } = setupReadyEntry();
    assert.throws(
      () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-zero', 'ref-zero', 0),
      /Amount must be greater than zero/
    );
  });

  // --- Feature 20: Synthetic Payment Webhook Mock ---
  test('F20-1: Valid HMAC signed webhook transitions payment to settled', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-hook-1', 'ref-hook-1', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'webhook-test-secret';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    const result = harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(result.payment.status, 'settled');
    assert.equal(entry.paid_minor, 120000);
  });

  test('F20-2: Webhook with invalid signature is rejected with 401', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-hook-2', 'ref-hook-2', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    assert.throws(
      () => harness.processSyntheticWebhook('invalid-sig', payloadRaw, 'webhook-test-secret'),
      /Invalid webhook HMAC signature/
    );
  });

  test('F20-3: Webhook for unknown payment throws 404', () => {
    const payloadRaw = JSON.stringify({ payment_id: 'pay-unknown-999', status: 'settled' });
    const secret = 'webhook-test-secret';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');
    assert.throws(
      () => harness.processSyntheticWebhook(sig, payloadRaw, secret),
      /Payment record not found/
    );
  });

  test('F20-4: Replaying identical settled webhook delivery does not double credit', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-hook-replay', 'ref-hook-replay', 120000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'webhook-test-secret';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(entry.paid_minor, 120000);
    // Replay
    harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(entry.paid_minor, 120000, 'Replay must not double credit balance');
  });

  test('F20-5: Webhook payload without settled status preserves pending state', () => {
    const { entry } = setupReadyEntry();
    entry.paid_minor = 0;
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-hook-other', 'ref-hook-other', 50000);
    const payloadRaw = JSON.stringify({ payment_id: payment.payment_id, status: 'processing' });
    const secret = 'webhook-test-secret';
    const sig = crypto.createHmac('sha256', secret).update(payloadRaw).digest('hex');

    const result = harness.processSyntheticWebhook(sig, payloadRaw, secret);
    assert.equal(result.payment.status, 'pending');
  });
});
