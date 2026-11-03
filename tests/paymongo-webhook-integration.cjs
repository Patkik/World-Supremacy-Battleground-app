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
  const invalidCases = [
    value => { value.data.attributes.data.attributes.payments.push(structuredClone(value.data.attributes.data.attributes.payments[0])); },
    value => { delete value.data.attributes.data.attributes.payments[0].attributes.currency; },
    value => { value.data.attributes.data.attributes.payments[0].attributes.livemode = true; },
    value => { value.data.attributes.data.type = 'payment'; },
    value => { delete value.data.attributes.data.attributes.payments[0].id; },
    value => { delete value.data.attributes.livemode; },
  ];
  for (const mutate of invalidCases) {
    const invalid = structuredClone(paidPayload); mutate(invalid);
    const raw = JSON.stringify(invalid);
    const rejected = await fetch(`${api}/v1/paymongo/webhook`, {method:'POST', headers:{'content-type':'application/json','paymongo-signature':sign(raw)}, body:raw});
    assert.equal(rejected.status, 400);
    assert.equal(rejected.status, 400);
    const quote = await (await fetch(`${base}/quote`, {headers})).json();
    assert.equal(quote.pending_amount_minor, 12500);
    assert.equal(quote.paid_amount_minor, 0);
  }
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
  const localAliasReplay = await fetch(`${api}/v1/local/paymongo/webhook`, {
    method:'POST', headers:{'content-type':'application/json','paymongo-signature':paidSig}, body:rawPaid
  });
  assert.equal(localAliasReplay.status, 200);

  for (const mutate of [
    value => { value.data.attributes.data.attributes.payments[0].id = `pay_changed_${crypto.randomUUID()}`; },
    value => { value.data.attributes.created_at += 1; },
  ]) {
    const changed = structuredClone(paidPayload); mutate(changed);
    const raw = JSON.stringify(changed);
    const response = await fetch(`${api}/v1/paymongo/webhook`, {method:'POST',headers:{'content-type':'application/json','paymongo-signature':sign(raw)},body:raw});
    assert.equal(response.status, 409);
  }

  const quoteReplay = await fetch(`${base}/quote`, { headers });
  assert.equal(quoteReplay.status, 200);
  const qr = await quoteReplay.json();
  assert.equal(qr.paid_amount_minor, 12500);

  // 9. Deliver a signed partial refund event for the settled provider payment
  const refundEvent = (id, refId, amount, paymentStatus) => ({
    data: {
      id,
      type: 'event',
      attributes: {
        type: 'payment.refunded',
        livemode: false,
        created_at: Math.floor(Date.now() / 1000),
        data: {
          id: paymentId,
          type: 'payment',
          attributes: {
            amount: 12500,
            currency: 'PHP',
            status: paymentStatus,
            refunds: [
              {
                id: refId,
                type: 'refund',
                attributes: {
                  payment_id: paymentId,
                  amount,
                  currency: 'PHP',
                  livemode: false,
                  status: 'succeeded'
                }
              }
            ]
          }
        }
      }
    }
  });
  const partialPayload = refundEvent(`evt_ref_${crypto.randomUUID().replaceAll('-', '')}`, `ref_${crypto.randomUUID().replaceAll('-', '')}`, 100, 'paid');
  const partialRaw = JSON.stringify(partialPayload);
  const partialResponse = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST', headers: { 'content-type':'application/json', 'paymongo-signature':sign(partialRaw) }, body:partialRaw
  });
  assert.equal(partialResponse.status, 200);
  assert.equal((await (await fetch(`${base}/quote`, { headers })).json()).paid_amount_minor, 12400);

  // 10. Replaying the same refund event does not refund twice
  const replayRefundRes = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paymongo-signature': sign(partialRaw)
    },
    body: partialRaw
  });
  assert.equal(replayRefundRes.status, 200);
  assert.equal((await (await fetch(`${base}/quote`, { headers })).json()).paid_amount_minor, 12400);

  // 11. A refund event for the remaining balance completes the refund
  const fullPayload = refundEvent(`evt_ref_${crypto.randomUUID().replaceAll('-', '')}`, `ref_${crypto.randomUUID().replaceAll('-', '')}`, 12400, 'refunded');
  const fullRaw = JSON.stringify(fullPayload);
  const fullResponse = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST', headers: { 'content-type':'application/json', 'paymongo-signature':sign(fullRaw) }, body:fullRaw
  });
  assert.equal(fullResponse.status, 200);
  assert.equal((await (await fetch(`${base}/quote`, { headers })).json()).paid_amount_minor, 0);

  // 12. Any further refund exceeds the settled payment
  const overPayload = refundEvent(`evt_ref_${crypto.randomUUID().replaceAll('-', '')}`, `ref_${crypto.randomUUID().replaceAll('-', '')}`, 1, 'refunded');
  const overRaw = JSON.stringify(overPayload);
  const overResponse = await fetch(`${api}/v1/webhooks/paymongo`, {
    method: 'POST', headers: { 'content-type':'application/json', 'paymongo-signature':sign(overRaw) }, body:overRaw
  });
  assert.equal(overResponse.status, 409);
  assert.equal((await (await fetch(`${base}/quote`, { headers })).json()).paid_amount_minor, 0);

  const wrongMode = structuredClone(fullPayload);
  wrongMode.data.id = `evt_ref_${crypto.randomUUID().replaceAll('-', '')}`;
  wrongMode.data.attributes.livemode = true;
  const wrongModeRaw = JSON.stringify(wrongMode);
  const wrongModeResponse = await fetch(`${api}/v1/webhooks/paymongo`, {
    method:'POST', headers:{ 'content-type':'application/json', 'paymongo-signature':sign(wrongModeRaw) }, body:wrongModeRaw
  });
  assert.equal(wrongModeResponse.status, 400);

  console.log('PASS: PayMongo webhook security, settlement replay, and refund reconciliation.');
})().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
