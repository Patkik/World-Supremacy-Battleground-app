// Adversarial Challenge Test Harness for Milestone 1
// Targets running wsb-api instance on port 8091
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE_URL = process.env.API_URL || 'http://127.0.0.1:8091';

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
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

const results = [];

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  const mark = passed ? '✔ PASS' : '✖ FAIL';
  console.log(`${mark}: ${name} - ${detail}`);
}

async function run() {
  console.log(`Starting Adversarial Challenge Suite against ${BASE_URL}...\n`);

  // --- Category 1: Gating & Health ---
  {
    const res = await request('/healthz');
    const passed = res.status === 200 && res.headers.get('cache-control') === 'no-store' && res.json?.status === 'ok';
    record('G1.1: /healthz 200 OK + no-store', passed, `status=${res.status}, cache=${res.headers.get('cache-control')}`);
  }

  {
    const res = await request('/readyz');
    const passed = res.status === 503 &&
      res.headers.get('cache-control') === 'no-store' &&
      res.json?.status === 'synthetic_only' &&
      res.json?.release_ready === false &&
      res.json?.durable_storage === false;
    record('G1.2: /readyz strictly 503 synthetic_only + release_ready:false', passed, `status=${res.status}, body=${res.text}`);
  }

  {
    const res = await request('/readyz', { method: 'POST', body: JSON.stringify({ ready: true }) });
    const passed = res.status === 405 && res.headers.get('cache-control') === 'no-store';
    record('G1.3: /readyz rejects mutation via POST', passed, `status=${res.status}`);
  }

  // --- Category 2: Forged & Unsigned Token Rejection ---
  const privateEndpoints = [
    '/v1/chapters/ph/session',
    '/v1/chapters/ph/crews',
    '/v1/chapters/ph/finance/summary',
    '/v1/chapters/ph/events/manila-session-2027/divisions/open-crew/results',
  ];

  for (const ep of privateEndpoints) {
    const res = await request(ep);
    const passed = res.status === 401 && res.headers.get('cache-control') === 'no-store';
    record(`T2.1: Missing Auth header returns 401 on ${ep}`, passed, `status=${res.status}`);
  }

  {
    // Empty token
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: 'Bearer ' }
    });
    const passed = res.status === 401;
    record('T2.2: Empty Bearer token rejected with 401', passed, `status=${res.status}`);
  }

  {
    // Invalid Auth Scheme (Basic instead of Bearer)
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' }
    });
    const passed = res.status === 401;
    record('T2.3: Non-Bearer auth scheme rejected with 401', passed, `status=${res.status}`);
  }

  {
    // Malformed random junk
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: 'Bearer not-a-jwt-at-all' }
    });
    const passed = res.status === 401;
    record('T2.4: Malformed random string rejected with 401', passed, `status=${res.status}`);
  }

  {
    // 2-part JWT (missing signature part)
    const header = b64url({ alg: 'none', typ: 'JWT' });
    const payload = b64url({ sub: 'attacker', chapterId: 'ph', role: 'chapter_director' });
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: `Bearer ${header}.${payload}` }
    });
    const passed = res.status === 401;
    record('T2.5: 2-part JWT rejected with 401', passed, `status=${res.status}`);
  }

  {
    // alg: "none" attack
    const header = b64url({ alg: 'none', typ: 'JWT' });
    const payload = b64url({
      sub: 'forged-admin',
      chapterId: 'ph',
      role: 'chapter_director',
      aud: 'demo-wsb',
      iss: 'https://securetoken.google.com/demo-wsb',
      iat: Math.floor(Date.now() / 1000),
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: `Bearer ${header}.${payload}.` }
    });
    const passed = res.status === 401;
    record('T2.6: alg: "none" signature bypass attack rejected with 401', passed, `status=${res.status}`);
  }

  {
    // HS256 algorithm confusion attack
    const header = b64url({ alg: 'HS256', typ: 'JWT' });
    const payload = b64url({
      sub: 'forged-admin',
      chapterId: 'ph',
      role: 'chapter_director',
      aud: 'demo-wsb',
      iss: 'https://securetoken.google.com/demo-wsb',
      iat: Math.floor(Date.now() / 1000),
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signature = crypto.createHmac('sha256', 'secret').update(`${header}.${payload}`).digest('base64url');
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: `Bearer ${header}.${payload}.${signature}` }
    });
    const passed = res.status === 401;
    record('T2.7: HS256 HMAC algorithm substitution rejected with 401', passed, `status=${res.status}`);
  }

  {
    // Self-signed RS256 with unknown kid
    const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const header = b64url({ alg: 'RS256', typ: 'JWT', kid: 'rogue-key-id' });
    const payload = b64url({
      sub: 'forged-admin',
      chapterId: 'ph',
      role: 'chapter_director',
      aud: 'demo-wsb',
      iss: 'https://securetoken.google.com/demo-wsb',
      iat: Math.floor(Date.now() / 1000),
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(privateKey, 'base64url');
    const res = await request('/v1/chapters/ph/session', {
      headers: { Authorization: `Bearer ${header}.${payload}.${signature}` }
    });
    const passed = res.status === 401;
    record('T2.8: Untrusted RS256 key rejected with 401', passed, `status=${res.status}`);
  }

  // --- Category 3: Cross-Chapter Tenant Evasion ---
  {
    // Event listing for PH returns only PH events
    const resPh = await request('/v1/chapters/ph/events');
    const eventsPh = resPh.json || [];
    const allPh = eventsPh.length > 0 && eventsPh.every(e => e.chapter_id === 'ph');
    record('E3.1: /v1/chapters/ph/events strictly scoped to ph chapter', allPh, `count=${eventsPh.length}`);

    // Event listing for AU returns only AU events (or empty, not PH events)
    const resAu = await request('/v1/chapters/au/events');
    const eventsAu = resAu.json || [];
    const hasPhInAu = eventsAu.some(e => e.chapter_id === 'ph' || e.id === 'manila-session-2027');
    record('E3.2: /v1/chapters/au/events excludes PH events', !hasPhInAu, `count=${eventsAu.length}, hasPhInAu=${hasPhInAu}`);

    // Direct event fetch cross-chapter: PH event queried under AU chapter route
    const resCrossEvent = await request('/v1/chapters/au/events/manila-session-2027');
    const passedCross = resCrossEvent.status === 404;
    record('E3.3: Cross-chapter event access /v1/chapters/au/events/manila-session-2027 returns 404', passedCross, `status=${resCrossEvent.status}`);
  }

  {
    // Non-existent chapter returns 200 with empty list (safe isolation)
    const resUnknown = await request('/v1/chapters/nonexistent/events');
    const eventsUnknown = resUnknown.json || [];
    const passed = eventsUnknown.length === 0;
    record('E3.4: Unknown chapter event discovery safely yields empty list', passed, `count=${eventsUnknown.length}`);
  }

  {
    // Path traversal in event lookup returns 404
    const resTraversal = await request('/v1/chapters/ph/events/..%2Fevents%2Fetc');
    const passed = resTraversal.status === 404 || resTraversal.status === 400;
    record('E3.5: Path traversal in event URL returns 404', passed, `status=${resTraversal.status}`);
  }

  // --- Category 4: Universal Cache-Control Verification ---
  {
    const routesToTest = [
      ['/healthz', 200],
      ['/readyz', 503],
      ['/v1/chapters', 200],
      ['/v1/chapters/ph/events', 200],
      ['/v1/chapters/ph/session', 401],
      ['/v1/chapters/ph/crews', 401],
      ['/non-existent-probe-route-404', 404],
    ];
    let allNoStore = true;
    for (const [path, expectedStatus] of routesToTest) {
      const res = await request(path);
      const cc = res.headers.get('cache-control');
      if (cc !== 'no-store' || res.status !== expectedStatus) {
        allNoStore = false;
        console.error(`Cache-control violation on ${path}: expected ${expectedStatus} + no-store, got ${res.status} + ${cc}`);
      }
    }
    record('C4.1: Universal Cache-Control: no-store on all routes and statuses', allNoStore, `tested ${routesToTest.length} routes`);
  }

  // Summary
  const failed = results.filter(r => !r.passed);
  console.log(`\n======================================================`);
  console.log(`Adversarial Challenge Completed: ${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed.`);
  console.log(`======================================================`);
  if (failed.length > 0) {
    console.error('Failed checks:', failed);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
