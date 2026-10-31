import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness } from '../harness/system_harness.mjs';

describe('Tier 3: Cross-Feature Interactions - Registration & Finance', () => {
  const harness = new SystemHarness();

  beforeEach(() => {
    harness.reset();
  });

  test('T3-01: F01 Auth + F06 Crew Creation: Authenticated manager creates chapter-scoped crew', () => {
    const token = harness.createToken({ sub: 'mgr-token-1', chapterId: 'ph', role: 'crew_manager' });
    const claims = harness.verifyToken(token, 'ph');
    const crew = harness.createCrew(claims.chapterId, claims.sub, 'Token Crew', 'Manila');
    assert.equal(crew.manager_uid, claims.sub);
    assert.equal(crew.chapter_id, claims.chapterId);
  });

  test('T3-02: F06 Crew + F07 Invite + F08 Redemption: Complete crew recruitment workflow', () => {
    const crew = harness.createCrew('ph', 'mgr-recruiter', 'Recruit Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-recruiter', 'Dancer');
    const { member } = harness.redeemInvitation('ph', inv.token, 'new-dancer-1', 'New Dancer', false);
    assert.equal(crew.members.length, 2);
    assert.equal(member.uid, 'new-dancer-1');
  });

  test('T3-03: F08 Minor Redemption + F14 Guardian Consent + F10 Canonical Selection', () => {
    const crew = harness.createCrew('ph', 'mgr-minor-flow', 'Minor Flow Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-minor-flow');
    harness.redeemInvitation('ph', inv.token, 'kid-1', 'Kid One', true);

    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(entry.roster.find(m => m.uid === 'kid-1').consent_verified, false);

    // Consent verified
    harness.submitGuardianConsent('ph', crew.id, 'kid-1', 'Guardian Jane', '2027-01-01');
    const updated = harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, entry.roster);
    assert.equal(updated.roster.find(m => m.uid === 'kid-1').consent_verified, true);
  });

  test('T3-04: F10 Performer Selection + F18 Fee Quote: Changing roster dynamically recalculates quote', () => {
    const crew = harness.createCrew('ph', 'mgr-quote-flow', 'Quote Flow Crew', 'Manila');
    for (let i = 1; i <= 6; i++) {
      crew.members.push({ uid: `d-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    // Initially all 6 dancers in entry
    const q1 = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(q1.dancer_count, 6);
    assert.equal(q1.total_amount_minor, 6 * 120000);

    // Update roster to 5 dancers
    harness.updateEntryRoster('ph', 'manila-session-2027', entry.id, crew.members.slice(0, 5));
    const q2 = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(q2.dancer_count, 4); // 4 dancers + 1 manager
    assert.equal(q2.total_amount_minor, 4 * 120000);
  });

  test('T3-05: F18 Fee Quote + F19 Split Payments: Multiple dancers reserve partial split shares', () => {
    const crew = harness.createCrew('ph', 'mgr-split-flow', 'Split Flow Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `sp-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    // Total is 5 * 120,000 = 600,000
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'sp-1', 'ref-share-1', 120000);
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'sp-2', 'ref-share-2', 120000);

    const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
    assert.equal(quote.pending_amount_minor, 240000);
    assert.equal(quote.available_amount_minor, 360000);
  });

  test('T3-06: F19 Split Payment + F20 Webhook + F21 Reconcile: Combined settlement routes', () => {
    const crew = harness.createCrew('ph', 'mgr-comb-pay', 'Comb Pay Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `cp-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    // Split 1: settles via webhook
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'cp-1', 'ref-comb-1', 240000);
    const rawWebhook = JSON.stringify({ payment_id: p1.payment_id, status: 'settled' });
    const sig = crypto.createHmac('sha256', 'demo-secret').update(rawWebhook).digest('hex');
    harness.processSyntheticWebhook(sig, rawWebhook, 'demo-secret');
    assert.equal(entry.paid_minor, 240000);

    // Split 2: settles via manual staff reconciliation
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'cp-2', 'ref-comb-2', 360000);
    harness.reconcilePayment('ph', p2.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 600000);
  });

  test('T3-07: F21 Reconciliation + F11 Readiness: Settling balance flips payment_ready to true', () => {
    const crew = harness.createCrew('ph', 'mgr-r-ready', 'Rec Ready Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `rr-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.track_filename = 'music.mp3';
    entry.track_duration_secs = 180;
    assert.equal(harness.evaluateReadiness(entry).payment_ready, false);

    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'rr-1', 'ref-full-pay', 600000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);

    const readiness = harness.evaluateReadiness(entry);
    assert.equal(readiness.payment_ready, true);
    assert.equal(readiness.is_ready, true);
  });

  test('T3-08: F22 Refund + F11 Readiness: Refunding balance revokes payment_ready back to false', () => {
    const crew = harness.createCrew('ph', 'mgr-ref-rev', 'Refund Revoke Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `rf-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    entry.track_filename = 'music.mp3';
    entry.track_duration_secs = 180;

    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'rf-1', 'ref-refund-rev', 600000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(harness.evaluateReadiness(entry).payment_ready, true);

    // Refund
    harness.refundPayment('ph', payment.payment_id, 'finance');
    assert.equal(harness.evaluateReadiness(entry).payment_ready, false);
    assert.equal(harness.evaluateReadiness(entry).is_ready, false);
  });

  test('T3-09: F16 Audio Duration + F11 Readiness: Compliant audio upload satisfies music_ready', () => {
    const crew = harness.createCrew('ph', 'mgr-audio-read', 'Audio Read Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `ar-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    assert.equal(harness.evaluateReadiness(entry).music_ready, false);

    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine.mp3', 184); // within 180 + 5s
    assert.equal(harness.evaluateReadiness(entry).music_ready, true);
  });

  test('T3-10: F11 Readiness + F12 Submission + F13 Approval: End-to-end registration gating', () => {
    const crew = harness.createCrew('ph', 'mgr-full-reg', 'Full Reg Crew', 'Manila');
    for (let i = 1; i <= 5; i++) {
      crew.members.push({ uid: `fr-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine.mp3', 175);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'fr-1', 'ref-fr-pay', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);

    const { entry: submitted } = harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(submitted.status, 'submitted');

    const approved = harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    assert.equal(approved.status, 'approved');
  });

  test('T3-11: F06 Crew Name + F09 Multi-Event: Same crew registers in multiple events', () => {
    const crew = harness.createCrew('ph', 'mgr-multi-event', 'Traveler Crew', 'Manila');
    harness.events.set('cebu-session-2027', {
      id: 'cebu-session-2027',
      chapter_id: 'ph',
      name: 'Cebu Session 2027',
      status: 'active',
      rules_version: '1',
    });
    harness.divisions.set('cebu-session-2027:open-crew', {
      id: 'open-crew',
      name: 'Open',
      min_members: 5,
      max_members: 20,
      max_duration_secs: 180,
      fee_minor: 120000,
    });

    const e1 = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    const e2 = harness.createEntryDraft('ph', 'cebu-session-2027', crew.id, 'open-crew');
    assert.notEqual(e1.id, e2.id);
    assert.equal(e1.event_id, 'manila-session-2027');
    assert.equal(e2.event_id, 'cebu-session-2027');
  });

  test('T3-12: F14 Minor Consent Revocation blocks F13 Entry Approval', () => {
    const crew = harness.createCrew('ph', 'mgr-consent-block', 'Consent Block Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-consent-block');
    harness.redeemInvitation('ph', inv.token, 'kid-block', 'Kid Block', true);
    for (let i = 2; i <= 5; i++) {
      crew.members.push({ uid: `cb-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    }
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
    harness.uploadPerformanceAudio('ph', 'manila-session-2027', entry.id, 'routine.mp3', 170);
    const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'cb-1', 'ref-cb-pay', 600000);
    harness.reconcilePayment('ph', p.payment_id, 'finance', true);

    // Minor consent still unverified
    assert.throws(
      () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true),
      /Cannot approve entry that fails 4-vector readiness/
    );
  });

  test('T3-13: F18 Fee Quote Currency + F02 Chapter Localization: Localized currencies', () => {
    const crewPh = harness.createCrew('ph', 'mgr-loc-ph', 'PH Crew', 'Manila');
    const crewAu = harness.createCrew('au', 'mgr-loc-au', 'AU Crew', 'Sydney');
    harness.events.set('sydney-session-2027', { id: 'sydney-session-2027', chapter_id: 'au', name: 'Sydney 2027', status: 'active', rules_version: '1' });
    harness.divisions.set('sydney-session-2027:open-crew', { id: 'open-crew', name: 'Open', min_members: 1, max_members: 10, max_duration_secs: 180, fee_minor: 8500 }); // AUD 85.00

    const ePh = harness.createEntryDraft('ph', 'manila-session-2027', crewPh.id, 'open-crew');
    const eAu = harness.createEntryDraft('au', 'sydney-session-2027', crewAu.id, 'open-crew');

    const qPh = harness.getPaymentQuote('ph', 'manila-session-2027', ePh.id);
    const qAu = harness.getPaymentQuote('au', 'sydney-session-2027', eAu.id);
    assert.equal(qPh.currency, 'PHP');
    assert.equal(qAu.currency, 'AUD');
  });

  test('T3-14: F19 Split Payments + F23 Finance Summary: Summary updates in real time', () => {
    const crew = harness.createCrew('ph', 'mgr-sum-rt', 'Realtime Sum Crew', 'Manila');
    for (let i = 1; i <= 5; i++) crew.members.push({ uid: `rt-${i}`, name: `D ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
    const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');

    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'rt-1', 'ref-rt-1', 120000);
    assert.equal(harness.getFinanceSummary('ph').total_pending_minor, 120000);
    assert.equal(harness.getFinanceSummary('ph').total_settled_minor, 0);

    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'rt-2', 'ref-rt-2', 120000);
    harness.reconcilePayment('ph', p2.payment_id, 'finance', true);
    assert.equal(harness.getFinanceSummary('ph').total_settled_minor, 120000);
  });

  test('T3-15: F15 Verification Vault + F08 Dancer Identity: Subject-owned verification case', () => {
    const crew = harness.createCrew('ph', 'mgr-v-flow', 'V Flow Crew', 'Manila');
    const inv = harness.createInvitation('ph', crew.id, 'mgr-v-flow');
    const { member } = harness.redeemInvitation('ph', inv.token, 'dancer-vault-1', 'Vault Dancer', false);

    const vCase = harness.createVerificationCase('ph', member.uid, 'identity', 'gs://vault/doc.pdf', 'application/pdf', 1024 * 300);
    assert.equal(vCase.dancer_uid, member.uid);
    assert.equal(vCase.status, 'pending');

    const reviewed = harness.reviewVerificationCase('ph', vCase.caseId, 'verifier', true);
    assert.equal(reviewed.status, 'approved');
  });
});
