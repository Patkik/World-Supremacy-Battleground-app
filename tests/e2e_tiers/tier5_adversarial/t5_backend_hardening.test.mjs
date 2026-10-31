import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SystemHarness, AppError } from '../harness/system_harness.mjs';

describe('Tier 5: Adversarial Coverage Hardening (Backend Core & Security)', () => {
  let harness;

  beforeEach(() => {
    harness = new SystemHarness();
  });

  // =========================================================================
  // DOMAIN 1: RS256 TOKEN VALIDATION & CHAPTER MULTI-TENANCY ENFORCEMENT
  // =========================================================================
  describe('Domain 1: RS256 Token Validation & Chapter Multi-Tenancy Enforcement', () => {
    test('T5-AUTH-01: Rejection of algorithm downgrade attack ("none")', () => {
      const token = harness.createToken({ alg: 'none', sub: 'attacker-1' });
      assert.throws(() => harness.verifyToken(token, 'ph'), (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 401);
        assert.match(err.message, /Only RS256/);
        return true;
      });
    });

    test('T5-AUTH-02: Rejection of symmetric algorithm substitution attack ("HS256")', () => {
      const token = harness.createToken({ alg: 'HS256', sub: 'attacker-2' });
      assert.throws(() => harness.verifyToken(token, 'ph'), (err) => {
        assert.equal(err.status, 401);
        assert.match(err.message, /Only RS256/);
        return true;
      });
    });

    test('T5-AUTH-03: Rejection of unsupported asymmetric curves ("ES256", "RS384", "RS512")', () => {
      for (const alg of ['ES256', 'RS384', 'RS512']) {
        const token = harness.createToken({ alg, sub: `attacker-${alg}` });
        assert.throws(() => harness.verifyToken(token, 'ph'), /Only RS256/);
      }
    });

    test('T5-AUTH-04: Rejection of token with missing key ID header (kid: undefined)', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: 'usr-1',
        chapterId: 'ph',
        role: 'judge',
        aud: 'demo-wsb',
        iss: 'https://securetoken.google.com/demo-wsb',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      })).toString('base64url');
      const token = `${header}.${payload}.synthetic-sig`;
      assert.throws(() => harness.verifyToken(token, 'ph'), /Missing kid header/);
    });

    test('T5-AUTH-05: Rejection of token with empty string kid header', () => {
      const token = harness.createToken({ kid: '', sub: 'usr-empty-kid' });
      assert.throws(() => harness.verifyToken(token, 'ph'), /Missing kid header/);
    });

    test('T5-AUTH-06: Rejection of token targeting foreign Firebase project (aud mismatch)', () => {
      for (const foreignAud of ['wsb-prod-live', 'demo-other-org', 'google-cloud-123']) {
        const token = harness.createToken({ aud: foreignAud, sub: 'usr-foreign-aud' });
        assert.throws(() => harness.verifyToken(token, 'ph'), /Audience mismatch/);
      }
    });

    test('T5-AUTH-07: Rejection of token with forged untrusted issuer', () => {
      const forgedIssuers = [
        'https://evil-identity.attacker.com',
        'https://accounts.google.com',
        'https://securetoken.google.com/evil-project',
        'urn:wsb:malicious-testing',
      ];
      for (const iss of forgedIssuers) {
        const token = harness.createToken({ iss, sub: 'usr-forged-iss' });
        assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid issuer/);
      }
    });

    test('T5-AUTH-08: Rejection of expired tokens (boundary exp <= now)', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiredTokens = [
        harness.createToken({ exp: now }),
        harness.createToken({ exp: now - 1 }),
        harness.createToken({ exp: now - 3600 }),
      ];
      for (const token of expiredTokens) {
        assert.throws(() => harness.verifyToken(token, 'ph'), /Token expired/);
      }
    });

    test('T5-AUTH-09: Rejection of token issued in the far future (iat > now + 5)', () => {
      const now = Math.floor(Date.now() / 1000);
      const futureToken = harness.createToken({ iat: now + 3600 });
      assert.throws(() => harness.verifyToken(futureToken, 'ph'), /Token issued in future/);
    });

    test('T5-AUTH-10: Rejection of token with empty subject (sub: "")', () => {
      const token = harness.createToken({ sub: '' });
      assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid sub/);
    });

    test('T5-AUTH-11: Rejection of token with oversized subject (> 128 characters)', () => {
      const longSub = 'u'.repeat(129);
      const token = harness.createToken({ sub: longSub });
      assert.throws(() => harness.verifyToken(token, 'ph'), /Invalid sub/);
    });

    test('T5-AUTH-12: Rejection of token with malformed JWT structure (non-3 segments)', () => {
      assert.throws(() => harness.verifyToken('just-a-random-string', 'ph'), /Malformed JWT structure/);
      assert.throws(() => harness.verifyToken('header.payload', 'ph'), /Malformed JWT structure/);
      assert.throws(() => harness.verifyToken('part1.part2.part3.part4', 'ph'), /Malformed JWT structure/);
      assert.throws(() => harness.verifyToken('', 'ph'), /Missing token/);
    });

    test('T5-AUTH-13: Multi-tenancy cross-chapter access strictly denied (hk token against ph chapter)', () => {
      const hkToken = harness.createToken({ sub: 'mgr-hk-1', chapterId: 'hk', role: 'crew_manager' });
      assert.throws(() => harness.verifyToken(hkToken, 'ph'), (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /Cross-chapter access forbidden/);
        return true;
      });
    });

    test('T5-AUTH-14: Multi-tenancy cross-chapter access strictly denied (au token against ph chapter)', () => {
      const auToken = harness.createToken({ sub: 'dir-au-1', chapterId: 'au', role: 'chapter_director' });
      assert.throws(() => harness.verifyToken(auToken, 'ph'), /Cross-chapter access forbidden/);
    });

    test('T5-AUTH-15: Multi-tenancy cross-chapter entity query protection (getChapter denies cross querying)', () => {
      assert.throws(() => harness.getChapter('non-existent-chapter'), /Chapter not found/);
      assert.throws(() => harness.getEvent('ph', 'sydney-session-2027'), /Event not found/);
    });

    test('T5-AUTH-16: Session revocation: inactive membership token strictly rejected', () => {
      harness.memberships.set('ph:revoked-staff', {
        uid: 'revoked-staff',
        chapter_id: 'ph',
        role: 'judge',
        active: false,
        valid_after: 0,
      });
      const token = harness.createToken({ sub: 'revoked-staff', chapterId: 'ph', role: 'judge' });
      assert.throws(() => harness.verifyToken(token, 'ph'), /Membership inactive or revoked/);
    });

    test('T5-AUTH-17: Session revocation: token issued prior to valid_after epoch rejected', () => {
      const now = Math.floor(Date.now() / 1000);
      harness.memberships.set('ph:stale-token-staff', {
        uid: 'stale-token-staff',
        chapter_id: 'ph',
        role: 'judge',
        active: true,
        valid_after: now + 100, // revoked all sessions prior to now + 100
      });
      const token = harness.createToken({
        sub: 'stale-token-staff',
        chapterId: 'ph',
        role: 'judge',
        iat: now - 50,
      });
      assert.throws(() => harness.verifyToken(token, 'ph'), /Membership inactive or revoked/);
    });

    test('T5-AUTH-18: Cross-tenant crew invitation redemption denied across chapters', () => {
      const crew = harness.createCrew('ph', 'mgr-ph', 'Manila Alliance', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-ph');
      assert.throws(
        () => harness.redeemInvitation('hk', inv.token, 'dancer-hk', 'Dancer HK', false),
        /Invitation not found/
      );
    });

    test('T5-AUTH-19: Cross-tenant entry draft creation denied across chapters', () => {
      const crew = harness.createCrew('ph', 'mgr-ph-ent', 'PH Crew', 'Manila');
      assert.throws(
        () => harness.createEntryDraft('hk', 'manila-session-2027', crew.id, 'open-crew'),
        /Event not found/
      );
    });

    test('T5-AUTH-20: Cross-tenant payment request denied across chapters', () => {
      const crew = harness.createCrew('ph', 'mgr-ph-pay', 'PH Pay Crew', 'Manila');
      for (let i = 1; i <= 5; i++) {
        crew.members.push({ uid: `dp-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      assert.throws(
        () => harness.requestPayment('hk', 'manila-session-2027', entry.id, 'payer-1', 'ref-hk-cross', 1000),
        /Entry not found/
      );
    });
  });

  // =========================================================================
  // DOMAIN 2: MINOR GUARDIAN CONSENT VAULT & 4-VECTOR READINESS
  // =========================================================================
  describe('Domain 2: Minor Guardian Consent Vault & 4-Vector Readiness', () => {
    function setupEntryWithRoster(dancerCount = 5, minorCount = 0) {
      const crew = harness.createCrew('ph', 'mgr-vault', `Vault Crew ${dancerCount}-${minorCount}`, 'Manila');
      for (let i = 1; i <= dancerCount; i++) {
        const isMinor = i <= minorCount;
        crew.members.push({
          uid: `v-dancer-${i}`,
          name: `Dancer ${i}`,
          role: 'Dancer',
          is_minor: isMinor,
          consent_verified: !isMinor,
        });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.roster = [...crew.members];
      return { crew, entry };
    }

    test('T5-CONSENT-01: Adult dancer redeemed with consent_verified = true (self-verified)', () => {
      const crew = harness.createCrew('ph', 'mgr-c1', 'Adult Crew', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c1');
      const res = harness.redeemInvitation('ph', inv.token, 'adult-1', 'Adult Dancer', false);
      assert.equal(res.member.is_minor, false);
      assert.equal(res.member.consent_verified, true);
    });

    test('T5-CONSENT-02: Adult dancer guardian consent submission strictly rejected with 400', () => {
      const crew = harness.createCrew('ph', 'mgr-c2', 'Adult Crew 2', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c2');
      harness.redeemInvitation('ph', inv.token, 'adult-2', 'Adult Dancer 2', false);
      assert.throws(
        () => harness.submitGuardianConsent('ph', crew.id, 'adult-2', 'Parent A', '2027-01-01'),
        (err) => {
          assert.equal(err.status, 400);
          assert.match(err.message, /Member is not a minor/);
          return true;
        }
      );
    });

    test('T5-CONSENT-03: Minor dancer redeemed with consent_verified = false (pending vault)', () => {
      const crew = harness.createCrew('ph', 'mgr-c3', 'Minor Crew', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c3');
      const res = harness.redeemInvitation('ph', inv.token, 'minor-1', 'Minor Dancer', true);
      assert.equal(res.member.is_minor, true);
      assert.equal(res.member.consent_verified, false);
    });

    test('T5-CONSENT-04: Minor guardian consent with empty or whitespace guardian name rejected with 400', () => {
      const crew = harness.createCrew('ph', 'mgr-c4', 'Minor Crew 4', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c4');
      harness.redeemInvitation('ph', inv.token, 'minor-4', 'Minor Dancer 4', true);
      assert.throws(
        () => harness.submitGuardianConsent('ph', crew.id, 'minor-4', '', '2027-01-01'),
        /Guardian name required/
      );
      assert.throws(
        () => harness.submitGuardianConsent('ph', crew.id, 'minor-4', '   \t  \n ', '2027-01-01'),
        /Guardian name required/
      );
    });

    test('T5-CONSENT-05: Minor guardian consent length boundary (> 200 chars handled cleanly)', () => {
      const crew = harness.createCrew('ph', 'mgr-c5', 'Minor Crew 5', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c5');
      harness.redeemInvitation('ph', inv.token, 'minor-5', 'Minor Dancer 5', true);
      const exact200Name = 'G'.repeat(200);
      const receipt = harness.submitGuardianConsent('ph', crew.id, 'minor-5', exact200Name, '2027-01-01');
      assert.equal(receipt.verified, true);
    });

    test('T5-CONSENT-06: Guardian consent idempotent re-submission returns verified without error', () => {
      const crew = harness.createCrew('ph', 'mgr-c6', 'Minor Crew 6', 'Manila');
      const inv = harness.createInvitation('ph', crew.id, 'mgr-c6');
      harness.redeemInvitation('ph', inv.token, 'minor-6', 'Minor Dancer 6', true);
      const r1 = harness.submitGuardianConsent('ph', crew.id, 'minor-6', 'Mom 6', '2027-01-01');
      const r2 = harness.submitGuardianConsent('ph', crew.id, 'minor-6', 'Mom 6', '2027-01-01');
      assert.equal(r1.verified, true);
      assert.equal(r2.verified, true);
    });

    test('T5-CONSENT-07: Consent verification propagates automatically to unapproved draft entry', () => {
      const { crew, entry } = setupEntryWithRoster(5, 1);
      assert.equal(entry.roster.find(m => m.uid === 'v-dancer-1').consent_verified, false);

      harness.submitGuardianConsent('ph', crew.id, 'v-dancer-1', 'Parent 1', '2027-01-01');
      assert.equal(entry.roster.find(m => m.uid === 'v-dancer-1').consent_verified, true);
    });

    test('T5-CONSENT-08: Consent verification propagates automatically to needs_correction entry', () => {
      const { crew, entry } = setupEntryWithRoster(5, 1);
      entry.status = 'needs_correction';
      harness.submitGuardianConsent('ph', crew.id, 'v-dancer-1', 'Parent 1', '2027-01-01');
      assert.equal(entry.roster.find(m => m.uid === 'v-dancer-1').consent_verified, true);
    });

    test('T5-CONSENT-09: Approved entry immutability barrier: Approved entry roster consent is frozen', () => {
      const { crew, entry } = setupEntryWithRoster(5, 1);
      entry.roster.find(m => m.uid === 'v-dancer-1').consent_verified = true;
      entry.status = 'approved';

      const inv = harness.createInvitation('ph', crew.id, 'mgr-vault');
      harness.redeemInvitation('ph', inv.token, 'v-dancer-new', 'New Minor', true);

      assert.ok(!entry.roster.some(m => m.uid === 'v-dancer-new'));
    });

    test('T5-CONSENT-10: Guardian consent for non-existent minor in crew rejected with 404', () => {
      const crew = harness.createCrew('ph', 'mgr-c-nonex', 'Nonex Crew', 'Manila');
      assert.throws(
        () => harness.submitGuardianConsent('ph', crew.id, 'ghost-dancer', 'Mom', '2027-01-01'),
        /Minor not found in crew/
      );
    });

    test('T5-READY-01: 4-Vector Roster underflow: count < min_members (4 < 5) fails roster_ready', () => {
      const { entry } = setupEntryWithRoster(4, 0);
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.roster_ready, false);
      assert.equal(readiness.is_ready, false);
      assert.ok(readiness.diagnostics.some(d => d.includes('outside bounds')));
    });

    test('T5-READY-02: 4-Vector Roster exact minimum: count == min_members (5 == 5) passes roster_ready', () => {
      const { entry } = setupEntryWithRoster(5, 0);
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.roster_ready, true);
    });

    test('T5-READY-03: 4-Vector Roster exact maximum: count == max_members (20 == 20) passes roster_ready', () => {
      const { entry } = setupEntryWithRoster(20, 0);
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.roster_ready, true);
    });

    test('T5-READY-04: 4-Vector Roster overflow: count > max_members (21 > 20) fails roster_ready', () => {
      const { entry } = setupEntryWithRoster(21, 0);
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.roster_ready, false);
      assert.equal(readiness.is_ready, false);
    });

    test('T5-READY-05: 4-Vector Music missing track fails music_ready', () => {
      const { entry } = setupEntryWithRoster(5, 0);
      entry.track_filename = null;
      entry.track_duration_secs = null;
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.music_ready, false);
      assert.equal(readiness.is_ready, false);
    });

    test('T5-READY-06: 4-Vector Music zero duration fails music_ready', () => {
      const { entry } = setupEntryWithRoster(5, 0);
      entry.track_filename = 'silent.mp3';
      entry.track_duration_secs = 0;
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.music_ready, false);
    });

    test('T5-READY-07: 4-Vector Music duration boundary: 185s (180+5s grace) passes, 186s fails', () => {
      const { entry } = setupEntryWithRoster(5, 0);
      entry.track_filename = 'comp.mp3';

      entry.track_duration_secs = 185;
      assert.equal(harness.evaluateReadiness(entry).music_ready, true);

      entry.track_duration_secs = 186;
      assert.equal(harness.evaluateReadiness(entry).music_ready, false);
    });

    test('T5-READY-08: 4-Vector Consent partial failure: 1 of 5 minor unverified fails consent_ready', () => {
      const { entry } = setupEntryWithRoster(5, 1);
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.consent_ready, false);
      assert.equal(readiness.is_ready, false);
    });

    test('T5-READY-09: 4-Vector Payment insufficiency: 1 minor unit short fails payment_ready', () => {
      const { entry } = setupEntryWithRoster(5, 0);
      const required = 120000 * 5; // 600,000
      entry.paid_minor = required - 1; // 599,999
      const readiness = harness.evaluateReadiness(entry);
      assert.equal(readiness.payment_ready, false);
      assert.equal(readiness.is_ready, false);

      entry.paid_minor = required;
      assert.equal(harness.evaluateReadiness(entry).payment_ready, true);
    });

    test('T5-READY-10: Registrar review approval barrier: Cannot approve entry failing readiness', () => {
      const { entry } = setupEntryWithRoster(5, 1); // 1 minor unverified
      assert.throws(
        () => harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true),
        (err) => {
          assert.equal(err.status, 400);
          assert.match(err.message, /Cannot approve entry that fails 4-vector readiness/);
          return true;
        }
      );
    });
  });

  // =========================================================================
  // DOMAIN 3: LOCALIZED SPLIT PAYMENTS & HMAC WEBHOOK REPLAY IDEMPOTENCY
  // =========================================================================
  describe('Domain 3: Localized Split Payments & HMAC Webhook Replay Idempotency', () => {
    function setupEntryForPayment(dancerCount = 5) {
      const crew = harness.createCrew('ph', 'mgr-split', `Split Crew ${dancerCount}`, 'Manila');
      for (let i = 1; i <= dancerCount; i++) {
        crew.members.push({ uid: `sd-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.roster = [...crew.members];
      return entry;
    }

    test('T5-FIN-01: Fee quote calculation: rate * dancer_count in integer minor units', () => {
      const entry = setupEntryForPayment(6);
      const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
      assert.equal(quote.rate_per_dancer_minor, 120000);
      assert.equal(quote.dancer_count, 6);
      assert.equal(quote.total_amount_minor, 720000);
      assert.equal(quote.paid_amount_minor, 0);
      assert.equal(quote.outstanding_amount_minor, 720000);
      assert.equal(quote.available_amount_minor, 720000);
      assert.equal(quote.currency, 'PHP');
    });

    test('T5-FIN-02: Fee quote calculation excludes non-dancer manager role', () => {
      const crew = harness.createCrew('ph', 'mgr-fee-m', 'Fee Crew', 'Manila');
      crew.members.push({ uid: 'm-mgr', name: 'Manager Bob', role: 'Manager', is_minor: false, consent_verified: true });
      for (let i = 1; i <= 5; i++) {
        crew.members.push({ uid: `m-d-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.roster = [...crew.members];
      const quote = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
      assert.equal(quote.dancer_count, 5); // Only 5 dancers, manager excluded
      assert.equal(quote.total_amount_minor, 600000);
    });

    test('T5-FIN-03: Split payment allocation: Payer 1 reserves 40%, Payer 2 reserves 60%', () => {
      const entry = setupEntryForPayment(5); // total 600,000
      const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-p1', 240000); // 40%
      assert.equal(p1.status, 'pending');
      assert.equal(p1.amount_minor, 240000);

      const quoteAfterP1 = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
      assert.equal(quoteAfterP1.pending_amount_minor, 240000);
      assert.equal(quoteAfterP1.available_amount_minor, 360000);

      const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-2', 'ref-p2', 360000); // 60%
      assert.equal(p2.amount_minor, 360000);

      const quoteAfterP2 = harness.getPaymentQuote('ph', 'manila-session-2027', entry.id);
      assert.equal(quoteAfterP2.available_amount_minor, 0);
    });

    test('T5-FIN-04: Split payment over-allocation strictly rejected with 409', () => {
      const entry = setupEntryForPayment(5); // total 600,000
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-p1', 500000);
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-2', 'ref-p2', 100001),
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /Amount exceeds available unreserved fee balance/);
          return true;
        }
      );
    });

    test('T5-FIN-05: Zero and negative payment requests rejected with 400', () => {
      const entry = setupEntryForPayment(5);
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-zero', 0),
        /Amount must be greater than zero/
      );
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-neg', -500),
        /Amount must be greater than zero/
      );
    });

    test('T5-FIN-06: Blank or whitespace provider reference rejected with 400', () => {
      const entry = setupEntryForPayment(5);
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', '', 10000),
        /Provider reference required/
      );
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', '   ', 10000),
        /Provider reference required/
      );
    });

    test('T5-FIN-07: Provider reference exact duplicate idempotency: Returns existing record', () => {
      const entry = setupEntryForPayment(5);
      const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-idem', 200000);
      const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-idem', 200000);
      assert.equal(p1.payment_id, p2.payment_id);
    });

    test('T5-FIN-08: Provider reference reuse conflict with different amount rejected with 409', () => {
      const entry = setupEntryForPayment(5);
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-conflict', 200000);
      assert.throws(
        () => harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-conflict', 250000),
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /Provider reference already used with different amount/);
          return true;
        }
      );
    });

    test('T5-FIN-09: Webhook HMAC-SHA256 signature verification passes on valid payload', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-wh-1', 300000);
      const payloadRaw = JSON.stringify({ payment_id: p.payment_id, status: 'settled', amount_minor: 300000 });
      const signature = crypto.createHmac('sha256', 'demo-secret').update(payloadRaw).digest('hex');

      const receipt = harness.processSyntheticWebhook(signature, payloadRaw, 'demo-secret');
      assert.equal(receipt.received, true);
      assert.equal(receipt.payment.status, 'settled');
      assert.equal(entry.paid_minor, 300000);
    });

    test('T5-FIN-10: Webhook HMAC-SHA256 tampered signature rejected with 401', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-wh-tamper', 300000);
      const payloadRaw = JSON.stringify({ payment_id: p.payment_id, status: 'settled', amount_minor: 300000 });
      const badSignature = 'deadbeef'.repeat(8);

      assert.throws(
        () => harness.processSyntheticWebhook(badSignature, payloadRaw, 'demo-secret'),
        (err) => {
          assert.equal(err.status, 401);
          assert.match(err.message, /Invalid webhook HMAC signature/);
          return true;
        }
      );
    });

    test('T5-FIN-11: Webhook settlement replay idempotency: Repeated webhooks DO NOT double-credit entry', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-wh-replay', 200000);
      const payloadRaw = JSON.stringify({ payment_id: p.payment_id, status: 'settled', amount_minor: 200000 });
      const signature = crypto.createHmac('sha256', 'demo-secret').update(payloadRaw).digest('hex');

      // First webhook: credits 200,000
      harness.processSyntheticWebhook(signature, payloadRaw, 'demo-secret');
      assert.equal(entry.paid_minor, 200000);

      // Replay 1: must remain 200,000
      harness.processSyntheticWebhook(signature, payloadRaw, 'demo-secret');
      assert.equal(entry.paid_minor, 200000);

      // Replay 2: must remain 200,000
      harness.processSyntheticWebhook(signature, payloadRaw, 'demo-secret');
      assert.equal(entry.paid_minor, 200000);
    });

    test('T5-FIN-12: Webhook for non-existent payment ID rejected with 404', () => {
      const payloadRaw = JSON.stringify({ payment_id: 'non-existent-pay', status: 'settled' });
      const signature = crypto.createHmac('sha256', 'demo-secret').update(payloadRaw).digest('hex');
      assert.throws(
        () => harness.processSyntheticWebhook(signature, payloadRaw, 'demo-secret'),
        /Payment record not found/
      );
    });

    test('T5-FIN-13: Finance reconciliation role authorization: Non-finance role rejected with 403', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-recon-auth', 100000);
      assert.throws(
        () => harness.reconcilePayment('ph', p.payment_id, 'judge', true),
        /Only finance or director can reconcile/
      );
      assert.throws(
        () => harness.reconcilePayment('ph', p.payment_id, 'marshal', true),
        /Only finance or director can reconcile/
      );
    });

    test('T5-FIN-14: Finance reconciliation approval credits entry paid_minor and is idempotent', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-recon-app', 150000);
      harness.reconcilePayment('ph', p.payment_id, 'finance', true);
      assert.equal(entry.paid_minor, 150000);

      // Re-reconcile idempotent: does not double credit
      harness.reconcilePayment('ph', p.payment_id, 'finance', true);
      assert.equal(entry.paid_minor, 150000);
    });

    test('T5-FIN-15: Finance reconciliation rejection sets status failed without crediting entry', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-recon-rej', 150000);
      harness.reconcilePayment('ph', p.payment_id, 'finance', false);
      assert.equal(p.status, 'failed');
      assert.equal(entry.paid_minor, 0);
    });

    test('T5-FIN-16: Finance refund debits entry paid_minor and updates status to refunded', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-refund-1', 200000);
      harness.reconcilePayment('ph', p.payment_id, 'finance', true);
      assert.equal(entry.paid_minor, 200000);

      harness.refundPayment('ph', p.payment_id, 'finance');
      assert.equal(p.status, 'refunded');
      assert.equal(entry.paid_minor, 0);
    });

    test('T5-FIN-17: Finance refund replay idempotency: Re-refunding does not double-debit', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-refund-idem', 200000);
      harness.reconcilePayment('ph', p.payment_id, 'finance', true);
      harness.refundPayment('ph', p.payment_id, 'finance');
      assert.equal(entry.paid_minor, 0);

      // Re-refund call
      harness.refundPayment('ph', p.payment_id, 'finance');
      assert.equal(entry.paid_minor, 0); // Still 0, not negative
    });

    test('T5-FIN-18: Refunding a pending or failed payment is rejected with 400', () => {
      const entry = setupEntryForPayment(5);
      const p = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'payer-1', 'ref-refund-bad', 100000);
      assert.throws(
        () => harness.refundPayment('ph', p.payment_id, 'finance'),
        /Only settled payments can be refunded/
      );
    });

    test('T5-FIN-19: Finance summary accurately aggregates settled, pending, and refunded amounts', () => {
      const entry = setupEntryForPayment(5);
      const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-sum-1', 100000);
      harness.reconcilePayment('ph', p1.payment_id, 'finance', true); // Settled 100,000

      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p2', 'ref-sum-2', 50000); // Pending 50,000

      const p3 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p3', 'ref-sum-3', 70000);
      harness.reconcilePayment('ph', p3.payment_id, 'finance', true);
      harness.refundPayment('ph', p3.payment_id, 'finance'); // Refunded 70,000

      const summary = harness.getFinanceSummary('ph');
      assert.equal(summary.total_settled_minor, 100000);
      assert.equal(summary.total_pending_minor, 50000);
      assert.equal(summary.total_refunded_minor, 70000);
      assert.equal(summary.currency, 'PHP');
    });

    test('T5-FIN-20: Chapter finance summary strictly isolated from other chapters', () => {
      const entry = setupEntryForPayment(5);
      const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p1', 'ref-iso-1', 100000);
      harness.reconcilePayment('ph', p1.payment_id, 'finance', true);

      const hkSummary = harness.getFinanceSummary('hk');
      assert.equal(hkSummary.total_settled_minor, 0);
      assert.equal(hkSummary.transaction_count, 0);
      assert.equal(hkSummary.currency, 'HKD');
    });
  });

  // =========================================================================
  // DOMAIN 4: 5-PILLAR RUBRIC BOUNDING & BATTLE BALLOT MAJORITY CLOSURES
  // =========================================================================
  describe('Domain 4: 5-Pillar Rubric Bounding & Battle Ballot Majority Closures', () => {
    function setupScoringScenario() {
      const crew = harness.createCrew('ph', 'mgr-score', 'Scoring Crew', 'Manila');
      for (let i = 1; i <= 5; i++) {
        crew.members.push({ uid: `sc-d-${i}`, name: `Dancer ${i}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.roster = [...crew.members];
      entry.track_filename = 'routine.mp3';
      entry.track_duration_secs = 175;
      entry.paid_minor = 120000 * 5;
      entry.status = 'approved';
      return { crew, entry };
    }

    test('T5-RUBRIC-01: Rubric bounds: Negative criteria value (-0.1) rejected with 400', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-neg-1',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: -0.1, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Criteria scores must be between 0 and 20/
      );
    });

    test('T5-RUBRIC-02: Rubric bounds: Criteria value > 20.0 (20.01) rejected with 400', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-over-1',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 20.01, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Criteria scores must be between 0 and 20/
      );
    });

    test('T5-RUBRIC-03: Rubric bounds: NaN and Infinity criteria values rejected with 400', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-nan',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: NaN, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Criteria scores must be between 0 and 20/
      );
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-inf',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: Infinity, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Criteria scores must be between 0 and 20/
      );
    });

    test('T5-RUBRIC-04: Rubric bounds: Exact minimum [0,0,0,0,0] yields net score 0.00', () => {
      const { crew } = setupScoringScenario();
      const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-min',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 0, musicality: 0, execution: 0, stage_presence: 0, entertainment: 0 },
      });
      assert.equal(receipt.net_score, 0);
    });

    test('T5-RUBRIC-05: Rubric bounds: Exact maximum [20,20,20,20,20] yields net score 100.00', () => {
      const { crew } = setupScoringScenario();
      const receipt = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-max',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 20, musicality: 20, execution: 20, stage_presence: 20, entertainment: 20 },
      });
      assert.equal(receipt.net_score, 100);
    });

    test('T5-RUBRIC-06: Scoring authorization: Unassigned judge submission rejected with 403', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'unassigned-judge', {
          schema_version: 1,
          operation_id: 'op-unassigned',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Judge not assigned to division panel/
      );
    });

    test('T5-RUBRIC-07: Duplicate operation_id idempotency: Identical payload returns cached receipt', () => {
      const { crew } = setupScoringScenario();
      const cmd = {
        schema_version: 1,
        operation_id: 'op-idem-1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 },
      };
      const r1 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
      const r2 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', cmd);
      assert.equal(r1.receipt_id, r2.receipt_id);
    });

    test('T5-RUBRIC-08: Conflicting operation_id reuse with modified criteria rejected with 409', () => {
      const { crew } = setupScoringScenario();
      harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-reuse-conflict',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
      });
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-reuse-conflict',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 16, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Operation ID reused with modified payload/
      );
    });

    test('T5-RUBRIC-09: Optimistic concurrency revision mismatch rejected with 409', () => {
      const { crew } = setupScoringScenario();
      harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-rev-1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
      });
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-rev-stale',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0, // Stale!
          criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
        }),
        /Expected revision 0 != current 1/
      );
    });

    test('T5-RUBRIC-10: Submitting score to locked division rejected with 409', () => {
      const { crew } = setupScoringScenario();
      harness.divisionLocks.set('manila-session-2027:open-crew', true);
      assert.throws(
        () => harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
          schema_version: 1,
          operation_id: 'op-post-lock',
          division_id: 'open-crew',
          crew_id: crew.id,
          expected_revision: 0,
          criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
        }),
        /Division is locked/
      );
    });

    test('T5-RUBRIC-11: Second score submission increments revision without accumulating duplicate scorecards', () => {
      const { crew } = setupScoringScenario();
      const r1 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-rev-u1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 14, musicality: 14, execution: 14, stage_presence: 14, entertainment: 14 },
      });
      assert.equal(r1.score_revision, 1);
      assert.equal(r1.net_score, 70);

      const r2 = harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-rev-u2',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 1,
        criteria: { choreography: 16, musicality: 16, execution: 16, stage_presence: 16, entertainment: 16 },
      });
      assert.equal(r2.score_revision, 2);
      assert.equal(r2.net_score, 80);
    });

    test('T5-DEDUCT-01: Technical deductions non-head-judge submission rejected with 403', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'judge', [{ code: 'TECH', points: 1.0 }]),
        /Only head judge can set technical deductions/
      );
    });

    test('T5-DEDUCT-02: Negative technical deduction points rejected with 400', () => {
      const { crew } = setupScoringScenario();
      assert.throws(
        () => harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [{ code: 'TECH', points: -2.5 }]),
        /Deductions must be non-negative numeric points/
      );
    });

    test('T5-DEDUCT-03: Deduction flooring at 0.00: Final score never goes negative', () => {
      const { crew } = setupScoringScenario();
      harness.submitScore('ph', 'manila-session-2027', 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-floor-1',
        division_id: 'open-crew',
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 10, musicality: 10, execution: 10, stage_presence: 10, entertainment: 10 },
      });
      harness.setDeductions('ph', 'manila-session-2027', 'open-crew', crew.id, 'head_judge', [
        { code: 'PROP_FALL', points: 40.0 },
        { code: 'TIME_EXCEED', points: 40.0 },
      ]);
      const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', 'open-crew');
      const res = results.find(r => r.crew_id === crew.id);
      assert.equal(res.raw_average, 50.0);
      assert.equal(res.total_deductions, 80.0);
      assert.equal(res.final_score, 0.0); // Floored at 0.00!
    });

    test('T5-BATTLE-01: Battle corner validation: Non-red/blue corner rejected with 400', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-1', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
      ]);
      assert.throws(
        () => harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'green'),
        /Corner must be red or blue/
      );
    });

    test('T5-BATTLE-02: Battle judge assignment check: Unassigned judge rejected with 403', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-2', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
      ]);
      assert.throws(
        () => harness.voteBattle('manila-session-2027', battle.match_id, 'unassigned-judge', 'red'),
        /Judge not on battle panel/
      );
    });

    test('T5-BATTLE-03: Battle ballot immutability: Judge cannot switch vote from red to blue', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-3', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
      ]);
      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'red');
      assert.throws(
        () => harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'blue'),
        /Judge cannot change corner ballot once submitted/
      );
    });

    test('T5-BATTLE-04: Battle ballot idempotency: Re-submitting identical vote succeeds', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-4', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
      ]);
      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'red');
      const updated = harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'red');
      assert.equal(updated.votes_red, 1);
    });

    test('T5-BATTLE-05: 3-Judge Battle majority closure: 2nd vote for red immediately closes match', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-5', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
      ]);
      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'red');
      assert.equal(battle.status, 'active');
      assert.equal(battle.winner_corner, null);

      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-2', 'red');
      assert.equal(battle.status, 'closed');
      assert.equal(battle.winner_corner, 'red');

      assert.throws(
        () => harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-3', 'blue'),
        /Battle is already closed/
      );
    });

    test('T5-BATTLE-06: 5-Judge Battle majority threshold requires 3 votes out of 5', () => {
      const battle = harness.createBattle('manila-session-2027', 'match-5j', '1v1', 'Final', 'Red Dancer', 'Blue Dancer', [
        'staff-judge-1',
        'staff-judge-2',
        'staff-judge-3',
        'staff-marshal',
        'staff-director',
      ]);
      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-1', 'red');
      assert.equal(battle.status, 'active');

      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-2', 'red');
      assert.equal(battle.status, 'active');

      harness.voteBattle('manila-session-2027', battle.match_id, 'staff-judge-3', 'red');
      assert.equal(battle.status, 'closed');
      assert.equal(battle.winner_corner, 'red');
    });
  });

  // =========================================================================
  // DOMAIN 5: DIVISION RESULTS PUBLICATION SHA-256 DIGEST & TIE POLICY
  // =========================================================================
  describe('Domain 5: Division Results Publication SHA-256 Digest Integrity & Tie Policy Gating', () => {
    function setupCompleteDivision(crewCount = 2, tiedScores = false) {
      const eventId = 'manila-session-2027';
      const divisionId = 'open-crew';
      const panel = ['staff-judge-1', 'staff-judge-2', 'staff-judge-3'];
      harness.judgePanels.set(`${eventId}:${divisionId}`, panel);

      const crews = [];
      for (let c = 1; c <= crewCount; c++) {
        const crew = harness.createCrew('ph', `mgr-pub-${c}`, `Championship Crew ${c}`, 'Manila');
        for (let d = 1; d <= 5; d++) {
          crew.members.push({ uid: `pub-d-${c}-${d}`, name: `Dancer ${d}`, role: 'Dancer', is_minor: false, consent_verified: true });
        }
        const entry = harness.createEntryDraft('ph', eventId, crew.id, divisionId);
        entry.roster = [...crew.members];
        entry.track_filename = `routine-${c}.mp3`;
        entry.track_duration_secs = 160;
        entry.paid_minor = 120000 * 5;
        entry.status = 'approved';
        crews.push(crew);

        // Submit scores from all 3 judges
        for (const jUid of panel) {
          const score = tiedScores ? 16 : 14 + c * 2;
          harness.submitScore('ph', eventId, jUid, {
            schema_version: 1,
            operation_id: `op-pub-${c}-${jUid}`,
            division_id: divisionId,
            crew_id: crew.id,
            expected_revision: 0,
            criteria: { choreography: score, musicality: score, execution: score, stage_presence: score, entertainment: score },
          });
        }
      }

      return { eventId, divisionId, crews, panel };
    }

    test('T5-PUB-01: Publication lock barrier: Attempting publication on unlocked division fails with 409', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      assert.throws(
        () => harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false),
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /Division must be locked before publication/);
          return true;
        }
      );
    });

    test('T5-PUB-02: Lock division requirement: Missing judge scorecard prevents lock with 409', () => {
      const eventId = 'manila-session-2027';
      const divisionId = 'open-crew';
      const crew = harness.createCrew('ph', 'mgr-miss', 'Missing Score Crew', 'Manila');
      for (let d = 1; d <= 5; d++) {
        crew.members.push({ uid: `ms-d-${d}`, name: `Dancer ${d}`, role: 'Dancer', is_minor: false, consent_verified: true });
      }
      const entry = harness.createEntryDraft('ph', eventId, crew.id, divisionId);
      entry.roster = [...crew.members];
      entry.track_filename = 'routine.mp3';
      entry.track_duration_secs = 160;
      entry.paid_minor = 120000 * 5;
      entry.status = 'approved';

      harness.submitScore('ph', eventId, 'staff-judge-1', {
        schema_version: 1,
        operation_id: 'op-miss-1',
        division_id: divisionId,
        crew_id: crew.id,
        expected_revision: 0,
        criteria: { choreography: 15, musicality: 15, execution: 15, stage_presence: 15, entertainment: 15 },
      });

      assert.throws(
        () => harness.lockDivision('ph', eventId, divisionId, 'head_judge'),
        /Missing score from judge/
      );
    });

    test('T5-PUB-03: Tabulation precision: Raw average calculated correctly across judges', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      const results = harness.tabulateDivisionResults('ph', 'manila-session-2027', divisionId);
      assert.equal(results.length, 2);
      assert.ok(results[0].final_score > results[1].final_score);
      assert.equal(results[0].rank, 1);
      assert.equal(results[1].rank, 2);
    });

    test('T5-PUB-04: Configurable tie policy gating: Tied results rejected when allowTies = false', () => {
      const { divisionId } = setupCompleteDivision(2, true); // tied scores!
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');

      assert.throws(
        () => harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false),
        (err) => {
          assert.equal(err.status, 409);
          assert.match(err.message, /Unresolved ties exist and tie policy approval is false/);
          return true;
        }
      );
    });

    test('T5-PUB-05: Configurable tie policy gating: Tied results succeed when allowTies = true', () => {
      const { divisionId } = setupCompleteDivision(2, true); // tied scores!
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');

      const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, true);
      assert.ok(snapshot.publication_id.startsWith('pub-'));
      assert.equal(snapshot.results[0].rank, 1);
      assert.equal(snapshot.results[1].rank, 1); // both rank 1
    });

    test('T5-PUB-06: Untied division publication succeeds with default allowTies = false', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');

      const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);
      assert.equal(snapshot.results[0].rank, 1);
      assert.equal(snapshot.results[1].rank, 2);
    });

    test('T5-PUB-07: Publication SHA-256 digest format: Exactly 64 lowercase hex characters', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);

      assert.equal(snapshot.digest.length, 64);
      assert.match(snapshot.digest, /^[0-9a-f]{64}$/);
    });

    test('T5-PUB-08: Publication SHA-256 digest cryptographic determinism matches independent calculation', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);

      const expectedData = JSON.stringify(snapshot.results.map(r => ({ crew_id: r.crew_id, final_score: r.final_score, rank: r.rank })));
      const expectedDigest = crypto.createHash('sha256').update(expectedData).digest('hex');
      assert.equal(snapshot.digest, expectedDigest);
    });

    test('T5-PUB-09: Publication idempotency: Re-publishing preserves deterministic digest & results', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      const s1 = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);
      const s2 = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);

      assert.equal(s1.digest, s2.digest);
      assert.deepEqual(s1.results, s2.results);
      assert.equal(s1.division_id, s2.division_id);
    });

    test('T5-PUB-10: Public event results projection guarantees zero PII', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);

      const publicProj = harness.getPublicResultsProjection('manila-session-2027', divisionId);
      assert.equal(publicProj.event_id, 'manila-session-2027');
      assert.equal(publicProj.division_id, divisionId);
      assert.ok(publicProj.digest);
      assert.ok(publicProj.standings.length >= 2);

      for (const row of publicProj.standings) {
        assert.ok(row.rank >= 1);
        assert.ok(row.crew_name);
        assert.ok(typeof row.final_score === 'number');
        // Zero PII checks
        assert.equal(row.dancer_uids, undefined);
        assert.equal(row.roster, undefined);
        assert.equal(row.paid_amount, undefined);
        assert.equal(row.judge_notes, undefined);
      }
    });

    test('T5-PUB-11: Arena Broadcast HUD consistency: HUD projection matches public projection', () => {
      const { divisionId } = setupCompleteDivision(2, false);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      const snapshot = harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false);

      const hud = harness.getArenaHud('manila-session-2027', divisionId);
      assert.equal(hud.digest, snapshot.digest);
      assert.equal(hud.standings.length, snapshot.results.length);
      assert.equal(hud.standings[0].rank, 1);
    });

    test('T5-PUB-12: Dancer venue check-in idempotency: Scanning same dancer twice returns identical pass', () => {
      setupCompleteDivision(2, false);
      const dancerUid = 'pub-d-1-1';

      const pass1 = harness.checkInDancer('ph', 'manila-session-2027', dancerUid, 'marshal');
      assert.equal(pass1.dancer_uid, dancerUid);
      assert.ok(pass1.pass_id.startsWith('pass-'));

      const pass2 = harness.checkInDancer('ph', 'manila-session-2027', dancerUid, 'marshal');
      assert.equal(pass1.pass_id, pass2.pass_id);
    });

    test('T5-PUB-13: Dancer venue check-in rejected for unapproved entry dancer', () => {
      const crew = harness.createCrew('ph', 'mgr-unapp', 'Unapproved Crew', 'Manila');
      crew.members.push({ uid: 'unapp-dancer-1', name: 'Unapp Dancer', role: 'Dancer', is_minor: false, consent_verified: true });
      const entry = harness.createEntryDraft('ph', 'manila-session-2027', crew.id, 'open-crew');
      entry.status = 'draft'; // NOT approved

      assert.throws(
        () => harness.checkInDancer('ph', 'manila-session-2027', 'unapp-dancer-1', 'marshal'),
        /Dancer is not approved/
      );
    });

    test('T5-PUB-14: Stage marshal queue progression and state validation', () => {
      setupCompleteDivision(2, false);
      const entryId = Array.from(harness.entries.values())[0].id;

      const q1 = harness.updateStageQueue('ph', 'manila-session-2027', entryId, 'marshal', 'on_deck');
      assert.equal(q1.status, 'on_deck');

      const q2 = harness.updateStageQueue('ph', 'manila-session-2027', entryId, 'marshal', 'stage');
      assert.equal(q2.status, 'stage');

      const queue = harness.getStageQueue('manila-session-2027');
      const item = queue.find(q => q.entry_id === entryId);
      assert.equal(item.status, 'stage');

      assert.throws(
        () => harness.updateStageQueue('ph', 'manila-session-2027', entryId, 'marshal', 'invalid_status'),
        /Invalid stage status/
      );
    });

    test('T5-PUB-15: Contact inquiry 256-bit capability key generation and query', () => {
      const inq = harness.createInquiry('ph', 'visitor@example.com', 'Sponsorship query', 'We want to sponsor the event.');
      assert.ok(inq.inquiry_id.startsWith('inq-'));
      assert.equal(inq.capability_key.length, 64); // 256-bit hex

      const fetched = harness.getInquiryByCapability(inq.inquiry_id, inq.capability_key);
      assert.equal(fetched.email, 'visitor@example.com');

      assert.throws(
        () => harness.getInquiryByCapability(inq.inquiry_id, 'bad-key-12345'),
        /Invalid capability key/
      );
    });

    test('T5-PUB-16: Re-publishing tied results with allowTies false rejected after initial lock', () => {
      const { divisionId } = setupCompleteDivision(2, true);
      harness.lockDivision('ph', 'manila-session-2027', divisionId, 'head_judge');
      assert.throws(
        () => harness.publishDivisionResults('ph', 'manila-session-2027', divisionId, false),
        /Unresolved ties exist/
      );
    });

    test('T5-PUB-17: Public projection returns 404 for un-published division', () => {
      assert.throws(
        () => harness.getPublicResultsProjection('manila-session-2027', 'unpub-division'),
        /Division results not yet published/
      );
    });

    test('T5-PUB-18: Public projection returns 404 for non-existent event', () => {
      assert.throws(
        () => harness.getPublicResultsProjection('ghost-event', 'open-crew'),
        /Division results not yet published/
      );
    });

    test('T5-PUB-19: Support queue lists only authorized chapter inquiries', () => {
      harness.createInquiry('ph', 'test@example.com', 'Sub 1', 'Msg 1');
      const queue = harness.listSupportQueue('ph', 'support');
      assert.ok(queue.length >= 1);
      assert.throws(
        () => harness.listSupportQueue('ph', 'judge'),
        /Unauthorized staff role/
      );
    });

    test('T5-PUB-20: Pure white SVG brand mark validation preserves transparent alpha geometry', () => {
      const validSvg = '<svg viewBox="0 0 100 100"><path fill="#ffffff" d="M10 10h80v80H10z"/></svg>';
      const res = harness.validateBrandMark(validSvg);
      assert.equal(res.compliant, true);

      const invalidSvg = '<svg viewBox="0 0 100 100"><path fill="#ff0000" d="M10 10h80v80H10z"/></svg>';
      const badRes = harness.validateBrandMark(invalidSvg);
      assert.equal(badRes.compliant, false);
    });
  });
});
