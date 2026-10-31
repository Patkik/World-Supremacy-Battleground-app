// Adversarial Challenge Test Harness for Milestone 3
// Localized Payments, HMAC Webhooks & Split Payment Reconciliations
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SystemHarness } from './e2e_tiers/harness/system_harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} — ${detail}`);
}

// RFC 4231 Test Vectors for HMAC-SHA256
function runRFC4231Tests() {
  console.log('\n[CRYPTO EMPIRICAL TEST] RFC 4231 HMAC-SHA256 Test Vectors');

  const testVectors = [
    {
      name: 'RFC 4231 Case 1: Key 20B 0x0b, Data "Hi There"',
      key: Buffer.alloc(20, 0x0b),
      data: Buffer.from('Hi There', 'utf8'),
      expected: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
    },
    {
      name: 'RFC 4231 Case 2: Key "Jefe", Data "what do ya want for nothing?"',
      key: Buffer.from('Jefe', 'utf8'),
      data: Buffer.from('what do ya want for nothing?', 'utf8'),
      expected: '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    },
    {
      name: 'RFC 4231 Case 3: Key 20B 0xaa, Data 50B 0xdd',
      key: Buffer.alloc(20, 0xaa),
      data: Buffer.alloc(50, 0xdd),
      expected: '773ea91e36800e46854db8ebd09181a72959098b3ef8c122d9635514ced565fe',
    },
    {
      name: 'RFC 4231 Case 4: Key 25B (0x01..0x19), Data 50B 0xcd',
      key: Buffer.from([
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
        0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14,
        0x15, 0x16, 0x17, 0x18, 0x19,
      ]),
      data: Buffer.alloc(50, 0xcd),
      expected: '82558a389a443c0ea4cc819899f2083a85f0faa3e578f8077a2e3ff46729665b',
    },
    {
      name: 'RFC 4231 Case 6: Key 131B 0xaa (>64B block size), Hash Key First',
      key: Buffer.alloc(131, 0xaa),
      data: Buffer.from('Test Using Larger Than Block-Size Key - Hash Key First', 'utf8'),
      expected: '60e431591ee0b67f0d8a26aacbf5b77f8e0bc6213728c5140546040f0ee37f54',
    },
    {
      name: 'RFC 4231 Case 7: Key 131B 0xaa, Data 152B (>64B key and data)',
      key: Buffer.alloc(131, 0xaa),
      data: Buffer.from(
        'This is a test using a larger than block-size key and a larger than block-size data. The key needs to be hashed before being used by the HMAC algorithm.',
        'utf8'
      ),
      expected: '9b09ffa71b942fcb27635fbcd5b0e944bfdc63644f0713938a7f51535c3a35e2',
    },
  ];

  for (const v of testVectors) {
    const computed = crypto.createHmac('sha256', v.key).update(v.data).digest('hex');
    const matches = computed === v.expected;
    record(v.name, matches, `digest=${computed.slice(0, 16)}...`);
  }
}

// SystemHarness Behavioral Invariants
function runSystemHarnessAttacks() {
  console.log('\n[ATTACK SUITE: SYSTEM HARNESS EMULATOR]');
  const harness = new SystemHarness();

  function setupReadyEntry() {
    harness.reset();
    const crew = harness.createCrew('ph', 'mgr-m3', 'M3 Test Crew', 'Manila');
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
    entry.track_duration_secs = 175;
    entry.paid_minor = 0;
    return { crew, entry };
  }

  // --- Attack Vector 1: Signature Forgery in Harness ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-harness-1', 'ref-h1', 120000);
    const rawPayload = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'demo-secret';
    const validSig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    // 1-bit modified signature
    const corruptedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a');
    let rejected1Bit = false;
    try {
      harness.processSyntheticWebhook(corruptedSig, rawPayload, secret);
    } catch (e) {
      if (e.status === 401) rejected1Bit = true;
    }
    record('H1.1: 1-bit modified HMAC signature rejected with 401', rejected1Bit, '1-bit flip rejected');

    // Truncated signature (63 chars)
    let rejectedTrunc = false;
    try {
      harness.processSyntheticWebhook(validSig.slice(0, 63), rawPayload, secret);
    } catch (e) {
      if (e.status === 401) rejectedTrunc = true;
    }
    record('H1.2: Truncated HMAC signature rejected with 401', rejectedTrunc, 'Truncated sig rejected');

    // Empty signature
    let rejectedEmpty = false;
    try {
      harness.processSyntheticWebhook('', rawPayload, secret);
    } catch (e) {
      if (e.status === 401) rejectedEmpty = true;
    }
    record('H1.3: Empty HMAC signature rejected with 401', rejectedEmpty, 'Empty sig rejected');
  }

  // --- Attack Vector 2: Casing Enforcement in Harness ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-harness-case', 'ref-case', 120000);
    const rawPayload = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'demo-secret';
    const sigUpper = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex').toUpperCase();

    let rejectedUpper = false;
    try {
      harness.processSyntheticWebhook(sigUpper, rawPayload, secret);
    } catch (e) {
      if (e.status === 401) rejectedUpper = true;
    }
    record('H2.1: Uppercase HMAC hex signature strictly rejected with 401 (T2-F20-3)', rejectedUpper, 'Uppercase sig rejected');
  }

  // --- Attack Vector 3: Payload Structure in Harness ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-harness-utf8', 'ref-utf8', 120000);
    const rawPayload = JSON.stringify({
      payment_id: payment.payment_id,
      status: 'settled',
      note: 'Pagbabayad ng crew 舞 🌟',
      metadata: { gateway: 'synthetic-sandbox', risk_level: 0 },
    });
    const secret = 'demo-secret';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    const receipt = harness.processSyntheticWebhook(sig, rawPayload, secret);
    const success = receipt.payment.status === 'settled' && entry.paid_minor === 120000;
    record('H3.1: UTF-8 & nested extra fields processed successfully', success, `paid_minor=${entry.paid_minor}`);
  }

  // --- Attack Vector 4: Non-existent Payment in Harness ---
  {
    const rawPayload = JSON.stringify({ payment_id: 'pay-nonexistent-404', status: 'settled' });
    const secret = 'demo-secret';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    let rejected404 = false;
    try {
      harness.processSyntheticWebhook(sig, rawPayload, secret);
    } catch (e) {
      if (e.status === 404) rejected404 = true;
    }
    record('H4.1: Unknown payment ID rejected with 404', rejected404, '404 on unknown payment');
  }

  // --- Attack Vector 5: Non-Settled Payload in Harness ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-harness-pending', 'ref-pending', 120000);
    const rawPayload = JSON.stringify({ payment_id: payment.payment_id, status: 'processing' });
    const secret = 'demo-secret';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    const receipt = harness.processSyntheticWebhook(sig, rawPayload, secret);
    const preserved = receipt.payment.status === 'pending' && entry.paid_minor === 0;
    record('H5.1: Non-settled status "processing" preserves pending state & 0 balance credit', preserved, 'Pending state preserved');
  }

  // --- Attack Vector 6: Replay Attack (10x Idempotency) in Harness ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-harness-replay', 'ref-rep', 120000);
    const rawPayload = JSON.stringify({ payment_id: payment.payment_id, status: 'settled' });
    const secret = 'demo-secret';
    const sig = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    for (let i = 0; i < 10; i++) {
      harness.processSyntheticWebhook(sig, rawPayload, secret);
    }
    const safe = entry.paid_minor === 120000;
    record('H6.1: 10x webhook replay attack causes zero double credit', safe, `final paid_minor=${entry.paid_minor}`);
  }

  // --- Attack Vector 7: Split Payments (0 Amount & Conflicting Reference) in Harness ---
  {
    const { entry } = setupReadyEntry();
    // 0 amount rejection
    let rejectedZero = false;
    try {
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-zero', 'ref-zero', 0);
    } catch (e) {
      if (e.status === 400) rejectedZero = true;
    }
    record('H7.1: Zero amount split payment rejected with 400', rejectedZero, 'Zero payment rejected');

    // Conflicting reference with different amount
    harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-conf-1', 'ref-conflict', 120000);
    let rejectedConflict = false;
    try {
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-conf-2', 'ref-conflict', 240000);
    } catch (e) {
      if (e.status === 409) rejectedConflict = true;
    }
    record('H7.2: Conflicting provider reference amount rejected with 409', rejectedConflict, 'Conflict rejected');
  }

  // --- Attack Vector 8: Duplicate Refund Attack (T2-F22-2) ---
  {
    const { entry } = setupReadyEntry();
    const payment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-refund-atk', 'ref-refund-atk', 600000);
    harness.reconcilePayment('ph', payment.payment_id, 'finance', true);
    assert.equal(entry.paid_minor, 600000);

    // Call refund 1st time -> status: refunded, entry.paid_minor = 0
    const ref1 = harness.refundPayment('ph', payment.payment_id, 'finance');
    const pass1 = ref1.status === 'refunded' && entry.paid_minor === 0;
    record('H8.1: First refund on settled payment debits balance exactly and sets status: refunded (T2-F22-1)', pass1, `paid_minor=${entry.paid_minor}`);

    // Call refund 2nd time (duplicate attack)
    const ref2 = harness.refundPayment('ph', payment.payment_id, 'finance');
    const pass2 = ref2.status === 'refunded' && entry.paid_minor === 0;
    record('H8.2: Duplicate refund on refunded payment is idempotent without negative balance (T2-F22-2)', pass2, `paid_minor=${entry.paid_minor}`);

    // Call refund 10x consecutively
    let floodRefundPass = true;
    for (let i = 0; i < 10; i++) {
      const refN = harness.refundPayment('ph', payment.payment_id, 'finance');
      if (refN.status !== 'refunded' || entry.paid_minor < 0 || entry.paid_minor !== 0) {
        floodRefundPass = false;
      }
    }
    record('H8.3: 10x consecutive refund replay attack strictly maintains zero balance (never negative)', floodRefundPass, `paid_minor=${entry.paid_minor}`);
  }

  // --- Attack Vector 9: Invalid State Refund (T2-F22-1 / T2-F22-2) ---
  {
    const { entry } = setupReadyEntry();
    // Attempt refund on pending payment
    const pendingPayment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-pending-ref', 'ref-pending-ref', 120000);
    let pendingRefundRejected = false;
    try {
      harness.refundPayment('ph', pendingPayment.payment_id, 'finance');
    } catch (e) {
      if (e.status === 400 || e.status === 409) pendingRefundRejected = true;
    }
    record('H9.1: Attempt to refund pending payment rejected with 400/409', pendingRefundRejected, 'Pending refund rejected');

    // Attempt refund on failed payment
    const failedPayment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-failed-ref', 'ref-failed-ref', 120000);
    harness.reconcilePayment('ph', failedPayment.payment_id, 'finance', false); // fail
    assert.equal(failedPayment.status, 'failed');

    let failedRefundRejected = false;
    try {
      harness.refundPayment('ph', failedPayment.payment_id, 'finance');
    } catch (e) {
      if (e.status === 400 || e.status === 409) failedRefundRejected = true;
    }
    record('H9.2: Attempt to refund failed payment rejected with 400/409', failedRefundRejected, 'Failed refund rejected');

    // Cross-chapter refund attempt
    const settledPayment = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-settled-ref', 'ref-settled-ref', 120000);
    harness.reconcilePayment('ph', settledPayment.payment_id, 'finance', true);
    let crossChapterRejected = false;
    try {
      harness.refundPayment('hk', settledPayment.payment_id, 'finance');
    } catch (e) {
      if (e.status === 404 || e.status === 403) crossChapterRejected = true;
    }
    record('H9.3: Attempt to refund cross-chapter payment rejected with 404/403', crossChapterRejected, 'Cross-chapter rejected');

    // Unauthorized role refund attempt
    let unauthorizedRejected = false;
    try {
      harness.refundPayment('ph', settledPayment.payment_id, 'dancer');
    } catch (e) {
      if (e.status === 403) unauthorizedRejected = true;
    }
    record('H9.4: Non-finance role refund attempt rejected with 403', unauthorizedRejected, '403 on unauthorized role');
  }

  // --- Attack Vector 10: Split Payment Boundaries ---
  {
    const { entry } = setupReadyEntry();
    // Quote total is 600,000 for 5 dancers
    // Submit payment exceeding available balance (600,001 > 600,000)
    let excessRejected = false;
    try {
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'p-excess', 'ref-excess', 600001);
    } catch (e) {
      if (e.status === 409) excessRejected = true;
    }
    record('H10.1: Payment request exceeding available fee balance rejected with 409', excessRejected, '409 on excess');

    // Identical duplicate provider reference is idempotent
    const pA = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-1', 'ref-idem-split', 300000);
    const pAReplay = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-1', 'ref-idem-split', 300000);
    const idemPass = pAReplay.payment_id === pA.payment_id && pAReplay.amount_minor === 300000;
    record('H10.2: Replaying identical provider reference returns existing payment idempotently', idemPass, `pay_id=${pAReplay.payment_id}`);

    // Reserve remaining 300,000
    const pB = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-2', 'ref-split-b', 300000);
    assert.equal(pB.amount_minor, 300000);

    // With 600,000 reserved, attempt 1 unit payment -> 409
    let zeroAvailRejected = false;
    try {
      harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-3', 'ref-split-c', 1);
    } catch (e) {
      if (e.status === 409) zeroAvailRejected = true;
    }
    record('H10.3: Split payment when available balance is 0 rejected with 409', zeroAvailRejected, '409 on 0 available');
  }

  // --- Attack Vector 11: Readiness Vector Flip & Revocation (T3-07, T3-08) ---
  {
    const { entry } = setupReadyEntry();
    assert.equal(entry.paid_minor, 0);

    // Initial state: payment_ready: false, is_ready: false
    const r0 = harness.evaluateReadiness(entry);
    const r0Pass = r0.payment_ready === false && r0.is_ready === false;
    record('H11.1: Initial entry with 0 paid has payment_ready: false and is_ready: false', r0Pass, `is_ready=${r0.is_ready}`);

    // Partial payment: 300,000 settled -> payment_ready: false
    const p1 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-1', 'ref-flip-1', 300000);
    harness.reconcilePayment('ph', p1.payment_id, 'finance', true);
    const r1 = harness.evaluateReadiness(entry);
    const r1Pass = r1.payment_ready === false && r1.is_ready === false;
    record('H11.2: 50% partial payment settlement preserves payment_ready: false and is_ready: false', r1Pass, `paid=${entry.paid_minor}`);

    // Settle remaining 300,000 -> payment_ready: true, is_ready: true (T3-07)
    const p2 = harness.requestPayment('ph', 'manila-session-2027', entry.id, 'dancer-2', 'ref-flip-2', 300000);
    harness.reconcilePayment('ph', p2.payment_id, 'finance', true);
    const r2 = harness.evaluateReadiness(entry);
    const r2Pass = r2.payment_ready === true && r2.is_ready === true;
    record('H11.3: Full settlement flips payment_ready to true and is_ready to true (T3-07)', r2Pass, `paid=${entry.paid_minor}, is_ready=${r2.is_ready}`);

    // Submit entry and approve
    harness.submitEntry('ph', 'manila-session-2027', entry.id);
    assert.equal(entry.status, 'submitted');
    harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    assert.equal(entry.status, 'approved');

    // Refund p1 (300,000) -> balance drops to 300,000 -> payment_ready revokes back to false (T3-08)
    harness.refundPayment('ph', p1.payment_id, 'finance');
    const r3 = harness.evaluateReadiness(entry);
    const r3Pass = r3.payment_ready === false && r3.is_ready === false;
    record('H11.4: Refunding payment revokes payment_ready back to false and is_ready back to false (T3-08)', r3Pass, `paid=${entry.paid_minor}, is_ready=${r3.is_ready}`);

    // Approval gate: Attempting approval when unready fails closed with 400
    entry.status = 'submitted';
    let approvalBlocked = false;
    try {
      harness.reviewEntry('ph', 'manila-session-2027', entry.id, 'registrar', true);
    } catch (e) {
      if (e.status === 400) approvalBlocked = true;
    }
    record('H11.5: Registrar approval fails closed with 400 when payment readiness is revoked', approvalBlocked, 'Approval blocked');
  }
}

// Live Rust Axum Server Empirical Verification
async function runLiveRustServerAttacks() {
  console.log('\n[ATTACK SUITE: LIVE RUST AXUM API SERVER]');

  const PORT = 8096;
  const BASE_URL = `http://127.0.0.1:${PORT}`;
  const SECRET = 'test-challenge-secret-12345';

  const exePath = path.join(projectRoot, 'target', 'debug', 'wsb-api.exe');
  console.log(`Spawning ${exePath} on port ${PORT} with WSB_WEBHOOK_SECRET=${SECRET}...`);

  const serverProcess = spawn(exePath, [], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(PORT),
      WSB_STORAGE: 'memory',
      WSB_WEBHOOK_SECRET: SECRET,
      FIREBASE_PROJECT_ID: 'demo-wsb',
    },
    stdio: 'ignore',
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to spawn server:', err);
  });

  // Wait for server readiness
  let online = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch(`${BASE_URL}/healthz`);
      if (res.status === 200) {
        online = true;
        break;
      }
    } catch {}
  }

  if (!online) {
    serverProcess.kill();
    throw new Error(`Rust Axum API failed to start on port ${PORT}`);
  }
  console.log(`Live Rust API is responsive at ${BASE_URL}\n`);

  try {
    // Helper for requests
    async function postWebhook(path, payloadStr, headers = {}) {
      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: payloadStr,
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {}
      return {
        status: res.status,
        headers: res.headers,
        text,
        json,
      };
    }

    // --- Vector 1: Signature Forgery against Axum ---
    console.log('Testing Signature Forgery against Axum...');
    const validPayload = JSON.stringify({
      payment_id: 'pay-1001',
      status: 'settled',
    });
    const validSig = crypto.createHmac('sha256', SECRET).update(validPayload).digest('hex');

    // 1-bit modified signature
    const corruptedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a');
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': corruptedSig,
      });
      const passed = res.status === 401 && res.headers.get('cache-control') === 'no-store';
      record('R1.1: 1-bit corrupted signature returns 401 Unauthorized + no-store', passed, `status=${res.status}`);
    }

    // Truncated signature (63 chars)
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': validSig.slice(0, 63),
      });
      const passed = res.status === 401 && res.headers.get('cache-control') === 'no-store';
      record('R1.2: Truncated 63-char signature returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // Extended signature (65 chars)
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': validSig + '0',
      });
      const passed = res.status === 401;
      record('R1.3: Extended 65-char signature returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // Empty signature header
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': '',
      });
      const passed = res.status === 401;
      record('R1.4: Empty X-Signature header returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // Whitespace signature header
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': '   ',
      });
      const passed = res.status === 401;
      record('R1.5: Whitespace X-Signature header returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // Missing signature header entirely
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {});
      const passed = res.status === 401;
      record('R1.6: Missing signature header returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // Completely bogus signature
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': '0000000000000000000000000000000000000000000000000000000000000000',
      });
      const passed = res.status === 401;
      record('R1.7: Invalid 64-char hex signature returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // --- Vector 2: Casing Enforcement against Axum ---
    console.log('\nTesting Signature Casing Enforcement against Axum...');
    // Full uppercase signature
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': validSig.toUpperCase(),
      });
      const passed = res.status === 401;
      record('R2.1: Full UPPERCASE HMAC hex signature returns 401 Unauthorized (T2-F20-3)', passed, `status=${res.status}`);
    }

    // Single uppercase character in signature
    {
      // Find first hex letter a-f to uppercase
      let singleUpperSig = validSig;
      for (let i = 0; i < validSig.length; i++) {
        if (/[a-f]/.test(validSig[i])) {
          singleUpperSig = validSig.slice(0, i) + validSig[i].toUpperCase() + validSig.slice(i + 1);
          break;
        }
      }
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': singleUpperSig,
      });
      const passed = res.status === 401;
      record('R2.2: Mixed-case signature with 1 uppercase char returns 401 Unauthorized', passed, `status=${res.status}`);
    }

    // --- Vector 3: Payload Variations & UTF-8 against Axum ---
    console.log('\nTesting Payload Variations & UTF-8 against Axum...');
    // Extra nested fields
    {
      const extraPayload = JSON.stringify({
        payment_id: 'pay-1001',
        status: 'settled',
        gateway_meta: { ip: '127.0.0.1', risk_score: 0.05 },
        tags: ['online', 'sandbox', 'm3'],
      });
      const sigExtra = crypto.createHmac('sha256', SECRET).update(extraPayload).digest('hex');
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', extraPayload, {
        'X-Signature': sigExtra,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R3.1: Extra nested JSON attributes return 200 OK + receipt (T2-F20-1)', passed, `status=${res.status}`);
    }

    // UTF-8 payload
    {
      const utf8Payload = JSON.stringify({
        payment_id: 'pay-1001',
        status: 'settled',
        note: 'Pagbabayad ng crew 舞 🇵🇭',
      });
      const sigUtf8 = crypto.createHmac('sha256', SECRET).update(utf8Payload).digest('hex');
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', utf8Payload, {
        'X-Signature': sigUtf8,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R3.2: UTF-8 payload "Pagbabayad ng crew 舞" returns 200 OK (T2-F20-2)', passed, `status=${res.status}`);
    }

    // Malformed JSON with valid HMAC over bad bytes
    {
      const badJson = '{"payment_id": "pay-1001", status: malformed...';
      const sigBadJson = crypto.createHmac('sha256', SECRET).update(badJson).digest('hex');
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', badJson, {
        'X-Signature': sigBadJson,
      });
      const passed = res.status === 400 && res.json?.error === 'Malformed webhook JSON payload';
      record('R3.3: Malformed JSON body with valid HMAC returns 400 Bad Request', passed, `status=${res.status}`);
    }

    // --- Vector 4: Invalid Payments & Multi-Tenant Chapter Isolation against Axum ---
    console.log('\nTesting Invalid Payments & Chapter Isolation against Axum...');
    // Unknown payment ID
    {
      const unknownPayload = JSON.stringify({
        payment_id: 'pay-ghost-99999',
        status: 'settled',
      });
      const sigUnknown = crypto.createHmac('sha256', SECRET).update(unknownPayload).digest('hex');
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', unknownPayload, {
        'X-Signature': sigUnknown,
      });
      const passed = res.status === 404 && res.json?.error === 'Payment record not found';
      record('R4.1: Webhook for non-existent payment ID returns 404 Not Found', passed, `status=${res.status}`);
    }

    // Cross-chapter isolation: payment 'pay-1001' belongs to 'ph', send to 'hk' chapter webhook route
    {
      const crossPayload = JSON.stringify({
        payment_id: 'pay-1001',
        status: 'settled',
      });
      const sigCross = crypto.createHmac('sha256', SECRET).update(crossPayload).digest('hex');
      const res = await postWebhook('/v1/chapters/hk/finance/webhook', crossPayload, {
        'X-Signature': sigCross,
      });
      const passed = res.status === 404 && res.json?.error === 'Payment record not found';
      record('R4.2: Cross-chapter webhook delivery returns 404 Not Found (PH payment sent to HK)', passed, `status=${res.status}`);
    }

    // --- Vector 5: Non-Settled Payload against Axum ---
    console.log('\nTesting Non-Settled Webhooks against Axum...');
    {
      const procPayload = JSON.stringify({
        payment_id: 'pay-1001',
        status: 'processing',
      });
      const sigProc = crypto.createHmac('sha256', SECRET).update(procPayload).digest('hex');
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', procPayload, {
        'X-Signature': sigProc,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R5.1: Non-settled status "processing" returns 200 OK receipt without error', passed, `status=${res.status}`);
    }

    // --- Vector 6: Header Variations & Global Endpoint against Axum ---
    console.log('\nTesting Header Variations & Global Alias against Axum...');
    // Lowercase x-wsb-signature header on chapter webhook
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'x-wsb-signature': validSig,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R6.1: Lowercase "x-wsb-signature" header accepted with 200 OK', passed, `status=${res.status}`);
    }

    // Lowercase x-signature header
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'x-signature': validSig,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R6.2: Lowercase "x-signature" header accepted with 200 OK', passed, `status=${res.status}`);
    }

    // Global alias route /v1/webhooks/payments
    {
      const res = await postWebhook('/v1/webhooks/payments', validPayload, {
        'X-WSB-Signature': validSig,
      });
      const passed = res.status === 200 && res.json?.received === true;
      record('R6.3: Global endpoint /v1/webhooks/payments accepts valid webhook with 200 OK', passed, `status=${res.status}`);
    }

    // Universal Cache-Control: no-store
    {
      const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
        'X-Signature': validSig,
      });
      const passed = res.headers.get('cache-control') === 'no-store';
      record('R6.4: Webhook response strictly includes Cache-Control: no-store', passed, `cache-control=${res.headers.get('cache-control')}`);
    }

    // --- Vector 7: 10x Replay Idempotency against Live Axum Server ---
    console.log('\nTesting 10x Replay Idempotency against Live Axum Server...');
    {
      let allReplaysSucceeded = true;
      for (let i = 0; i < 10; i++) {
        const res = await postWebhook('/v1/chapters/ph/finance/webhook', validPayload, {
          'X-Signature': validSig,
        });
        if (res.status !== 200 || res.json?.received !== true) {
          allReplaysSucceeded = false;
          break;
        }
      }
      record('R7.1: 10 consecutive identical webhook replays succeed idempotently (200 OK)', allReplaysSucceeded, 'All 10 replays returned 200 OK');
    }

  } finally {
    console.log('\nTerminating Rust Axum API server...');
    serverProcess.kill('SIGTERM');
  }
}

async function main() {
  console.log('='.repeat(78));
  console.log('  MILESTONE 3: ADVERSARIAL STRESS TEST & EMPIRICAL CHALLENGE SUITE');
  console.log('='.repeat(78));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(78));

  // 1. Run RFC 4231 standard vectors
  runRFC4231Tests();

  // 2. Run SystemHarness emulator attacks
  runSystemHarnessAttacks();

  // 3. Run Live Rust Axum Server attacks
  await runLiveRustServerAttacks();

  // Summary
  console.log('\n' + '='.repeat(78));
  console.log('  MILESTONE 3 ADVERSARIAL CHALLENGE SUMMARY');
  console.log('='.repeat(78));
  const failed = results.filter((r) => !r.passed);
  console.log(`Total Scenarios: ${results.length}`);
  console.log(`Passed:          ${results.length - failed.length}`);
  console.log(`Failed:          ${failed.length}`);
  console.log('='.repeat(78));

  if (failed.length > 0) {
    console.error('\nFAILURES ENCOUNTERED:');
    for (const f of failed) {
      console.error(`- ${f.name}: ${f.detail}`);
    }
    process.exit(1);
  } else {
    console.log('ALL ADVERSARIAL ATTACK VECTORS REPELLED CLEANLY! Deterministic exit code: 0\n');
  }
}

main().catch((err) => {
  console.error('Fatal challenge runner error:', err);
  process.exit(1);
});
