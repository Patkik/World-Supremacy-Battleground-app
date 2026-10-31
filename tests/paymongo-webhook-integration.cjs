const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { readFileSync } = require('node:fs');

const envDocker = Object.fromEntries(
  readFileSync('.env.docker', 'utf8')
    .split(/\r?\n/)
    .filter(x => x && !x.startsWith('#'))
    .map(x => {
      const i = x.indexOf('=');
      return [x.slice(0, i), x.slice(i + 1)];
    })
);

const api = `http://localhost:${envDocker.WSB_API_PORT || 8189}`;
const db = `http://localhost:${envDocker.WSB_FIRESTORE_PORT || 8188}/v1/projects/demo-wsb/databases/(default)/documents`;
const secret = envDocker.WSB_PAYMONGO_LOCAL_SECRET;
assert.ok(secret && secret.length >= 32, 'WSB_PAYMONGO_LOCAL_SECRET is required');

function sign(rawBody, ts = Math.floor(Date.now() / 1000), key = secret) {
  const hmac = crypto.createHmac('sha256', key).update(`${ts}.${rawBody}`).digest('hex');
  return `t=${ts},te=${hmac},li=`;
}

async function login(email) {
  const r = await fetch(`${api}/local/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: envDocker.WSB_TEST_PASSWORD, chapter_id: 'ph' })
  });
  assert.equal(r.status, 200);
  return (await r.json()).token;
}

(async () => {
  // 1. Missing signature header -> 401
  const body = JSON.stringify({ data: { id: 'evt_1', type: 'event' } });
  const noSig = await fetch(`${api}/v1/paymongo/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
  });
  assert.equal(noSig.status, 401);

  // 2. Tampered signature -> 401
  const badSig = await fetch(`${api}/v1/paymongo/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': 't=1000000000,te=deadbeef,li='
    },
    body
  });
  assert.equal(badSig.status, 401);

  // 3. Expired timestamp (>300s skew) -> 401
  const expiredTs = Math.floor(Date.now() / 1000) - 400;
  const expiredSig = sign(body, expiredTs);
  const expiredRes = await fetch(`${api}/v1/paymongo/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': expiredSig
    },
    body
  });
  assert.equal(expiredRes.status, 401);

  // 4. Global route alias /v1/webhooks/paymongo responds with signature check
  const aliasRes = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': 't=1000000000,te=deadbeef,li='
    },
    body
  });
  assert.equal(aliasRes.status, 401);

  // 5. Create synthetic test entry in Firestore
  const entryId = `webhook-test-${crypto.randomUUID()}`;
  const fixture = await fetch(
    `${db}/chapters/ph/events/local-rehearsal/entries/local-entry-draft`,
    { headers: { authorization: 'Bearer owner' } }
  );
  assert.equal(fixture.status, 200);
  const record = await fixture.json();
  record.fields.entry.mapValue.fields.id = { stringValue: entryId };
  record.fields.entry.mapValue.fields.paid_minor = { integerValue: '0' };
  record.fields.pending_minor = { integerValue: '0' };

  const write = await fetch(
    `${db}/chapters/ph/events/local-rehearsal/entries/${entryId}`,
    {
      method: 'PATCH',
      headers: { authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: record.fields })
    }
  );
  assert.equal(write.status, 200);

  const manager = await login('manager@ph.wsb.test');
  const base = `${api}/v1/chapters/ph/events/local-rehearsal/entries/${entryId}`;
  const headers = { 'content-type': 'application/json', authorization: `Bearer ${manager}` };

  // 6. Start checkout reservation
  const opId = crypto.randomUUID();
  const checkoutRes = await fetch(`${base}/paymongo/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ operation_id: opId, amount_minor: 12500 })
  });
  assert.equal(checkoutRes.status, 200);
  const checkoutData = await checkoutRes.json();
  assert.ok(checkoutData.session_id.startsWith('cs_'));

  // Verify pending balance in quote
  const quoteBefore = await fetch(`${base}/quote`, { headers });
  assert.equal(quoteBefore.status, 200);
  const qb = await quoteBefore.json();
  assert.equal(qb.pending_amount_minor, 12500);
  assert.equal(qb.paid_amount_minor, 0);

  // 7. Deliver signed checkout_session.payment.paid webhook event
  const eventId = `evt_paid_${crypto.randomUUID().replaceAll('-', '')}`;
  const paymentId = `pay_${crypto.randomUUID().replaceAll('-', '')}`;
  const paidPayload = {
    data: {
      id: eventId,
      type: 'event',
      attributes: {
        type: 'checkout_session.payment.paid',
        livemode: false,
        created_at: Math.floor(Date.now() / 1000),
        data: {
          id: checkoutData.session_id,
          type: 'checkout_session',
          attributes: {
            reference_number: checkoutData.reference_number,
            livemode: false,
            status: 'paid',
            payments: [
              {
                id: paymentId,
                type: 'payment',
                attributes: {
                  amount: 12500,
                  currency: 'PHP',
                  status: 'paid',
                  livemode: false
                }
              }
            ]
          }
        }
      }
    }
  };
  const rawPaid = JSON.stringify(paidPayload);
  const paidSig = sign(rawPaid);

  const deliverRes = await fetch(`${api}/v1/paymongo/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': paidSig
    },
    body: rawPaid
  });
  if (deliverRes.status !== 200) {
    console.error('DELIVER PAID ERROR:', deliverRes.status, await deliverRes.text());
  }
  assert.equal(deliverRes.status, 200);
  assert.deepEqual(await deliverRes.json(), { received: true });

  // Verify balance transitioned from pending to paid
  const quoteAfter = await fetch(`${base}/quote`, { headers });
  assert.equal(quoteAfter.status, 200);
  const qa = await quoteAfter.json();
  assert.equal(qa.pending_amount_minor, 0);
  assert.equal(qa.paid_amount_minor, 12500);

  // 8. Re-delivering the exact same event is idempotent (returns 200 OK without double crediting)
  const replayRes = await fetch(`${api}/v1/paymongo/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': paidSig
    },
    body: rawPaid
  });
  assert.equal(replayRes.status, 200);

  const quoteReplay = await fetch(`${base}/quote`, { headers });
  assert.equal(quoteReplay.status, 200);
  const qr = await quoteReplay.json();
  assert.equal(qr.paid_amount_minor, 12500);

  // 9. Deliver signed payment.refunded webhook event to route alias /v1/webhooks/paymongo
  const refundEventId = `evt_ref_${crypto.randomUUID().replaceAll('-', '')}`;
  const refundPayload = {
    data: {
      id: refundEventId,
      type: 'event',
      attributes: {
        type: 'payment.refunded',
        livemode: false,
        created_at: Math.floor(Date.now() / 1000),
        data: {
          id: checkoutData.session_id,
          type: 'payment',
          attributes: {
            amount: 12500,
            currency: 'PHP',
            status: 'refunded',
            refunds: [
              {
                id: `ref_${crypto.randomUUID().replaceAll('-', '')}`,
                amount: 12500,
                status: 'succeeded'
              }
            ]
          }
        }
      }
    }
  };
  const rawRefund = JSON.stringify(refundPayload);
  const refundSig = sign(rawRefund);

  const deliverRefundRes = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': refundSig
    },
    body: rawRefund
  });
  if (deliverRefundRes.status !== 200) {
    console.error('DELIVER REFUND ERROR:', deliverRefundRes.status, await deliverRefundRes.text());
  }
  assert.equal(deliverRefundRes.status, 200);
  assert.deepEqual(await deliverRefundRes.json(), { received: true });

  // Verify paid balance refunded
  const quoteRefunded = await fetch(`${base}/quote`, { headers });
  assert.equal(quoteRefunded.status, 200);
  const qref = await quoteRefunded.json();
  assert.equal(qref.paid_amount_minor, 0);

  // 10. Replay refund event is idempotent
  const replayRefundRes = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': refundSig
    },
    body: rawRefund
  });
  assert.equal(replayRefundRes.status, 200);

  console.log('PASS: PayMongo webhook security matrix, checkout session settlement, refund reconciliation, and idempotency verified.');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
