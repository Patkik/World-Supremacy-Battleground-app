// End-to-end API checks against an isolated synthetic chapter in the local stack.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const project = process.env.GCLOUD_PROJECT;
if (project !== 'demo-wsb' || !/^firebase:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') || !/^firebase:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Only the Docker demo-wsb stack is allowed');
const api = 'http://api:8088';
const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-wsb/databases/(default)/documents`;
const file = '/local-identity/recovery-check.json';
const key = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
function value(item) {
  if (item === null) return { nullValue: null };
  if (typeof item === 'boolean') return { booleanValue: item };
  if (typeof item === 'number') return { integerValue: String(item) };
  if (typeof item === 'string') return { stringValue: item };
  if (Array.isArray(item)) return { arrayValue: { values: item.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([k, v]) => [k, value(v)])) } };
}
async function put(path, document) {
  const response = await fetch(`${base}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: value(document).mapValue.fields }) });
  assert.equal(response.status, 200, 'test fixture write');
}
async function request(path, token, body, expected = 200) {
  const response = await fetch(`${api}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, expected, `${path} returned ${response.status}; expected ${expected}`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return expected === 200 ? response.json() : null;
}
async function login(name, chapter) {
  return request('/local/session', null, { email: `${name}@ph.wsb.test`, password: process.env.WSB_TEST_PASSWORD, chapter_id: chapter });
}
async function main() {
  if (process.argv.includes('--recover')) {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    const judge = await login('judge1', saved.chapter);
    const receipt = await request(`${saved.root}/scores`, judge.token, saved.command);
    assert.deepEqual(receipt, saved.receipt, 'receipt survives full stack recreation');
    const state = await request(`${saved.root}/divisions/open/score-state?crew_id=ready`, judge.token);
    assert.equal(state.locked, true);
    const manager = await login('manager', saved.chapter);
    const quote = await request(`${saved.root}/entries/draft/quote`, manager.token);
    assert.equal(quote.pending_amount_minor, 0);
    assert.equal(quote.paid_amount_minor, 0);
    console.log('PASS: signed login, locked score receipt and refunded balance survived full stack recreation.');
    return;
  }
  await request('/healthz');
  const ready = await fetch(`${api}/readyz`);
  assert.equal(ready.status, 503);
  const readiness = await ready.json();
  assert.equal(readiness.database_reachable, true);
  assert.equal(readiness.release_ready, false);
  await request('/local/session', null, { email: 'judge1@ph.wsb.test', password: 'incorrect-test-password', chapter_id: 'ph' }, 401);
  const raw = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'judge1@ph.wsb.test', password: process.env.WSB_TEST_PASSWORD, returnSecureToken: true }) }).then(r => r.json());
  assert.ok(raw.idToken);
  await request('/v1/chapters/ph/session', raw.idToken, undefined, 401);

  const chapter = `docker-check-${randomUUID()}`;
  const event = 'recovery';
  const root = `/v1/chapters/${chapter}/events/${event}`;
  const parent = `chapters/${chapter}/events/${event}`;
  const now = Math.floor(Date.now() / 1000);
  await put(`chapters/${chapter}`, { id: chapter, name: 'Synthetic Docker checks', currency: 'PHP' });
  await put(parent, { id: event, chapter_id: chapter, name: 'Synthetic recovery test', status: 'active', rules_version: 'test-fixture' });
  for (const [name, role] of [['manager', 'crew_manager'], ['judge1', 'judge'], ['judge2', 'judge'], ['finance', 'finance'], ['head', 'head_judge']]) {
    const uid = `local-ph-${name}`;
    await put(`chapters/${chapter}/members/${uid}`, { uid, chapter_id: chapter, role, active: true, valid_after: 0 });
    await put(`${parent}/assignments/${uid}`, { uid, event_id: event, active: true });
  }
  await put(`${parent}/divisionState/open`, { policy: { id: 'open', name: 'Synthetic', min_members: 1, max_members: 4, max_duration_secs: 180, max_age: null, fee_minor: 150000 }, panel: ['local-ph-judge1', 'local-ph-judge2'], locked: false, generation: 0, approved_entries: 1, completed_scorecards: 0, unready_entries: 0, publication_id: null });
  for (const entryId of ['ready', 'draft']) {
    const roster = [{ uid: 'local-ph-manager', name: 'Synthetic adult', role: 'Manager', is_minor: false, consent_verified: true }];
    await put(`chapters/${chapter}/crews/${entryId}`, { id: entryId, chapter_id: chapter, name: 'Synthetic crew', city: 'Test', manager_uid: 'local-ph-manager', members: roster, created_at: now });
    await put(`${parent}/entries/${entryId}`, { entry: { id: entryId, chapter_id: chapter, event_id: event, crew_id: entryId, division_id: 'open', roster, track_filename: 'synthetic.mp3', track_duration_secs: 120, paid_minor: entryId === 'ready' ? 150000 : 0, status: entryId === 'ready' ? 'approved' : 'draft', created_at: now, updated_at: now }, pending_minor: 0, completed_scorecards: 0 });
    await put(`${parent}/entryIndex/${key(['open', entryId])}`, { entry_id: entryId, crew_id: entryId, division_id: 'open' });
  }
  const [manager, judge1, judge2, finance, head] = await Promise.all(['manager', 'judge1', 'judge2', 'finance', 'head'].map(name => login(name, chapter)));
  assert.equal(JSON.parse(Buffer.from(judge1.token.split('.')[0], 'base64url')).alg, 'RS256');
  const forged = judge1.token.split('.');
  forged[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(forged[1], 'base64url')), role: 'chapter_director' })).toString('base64url');
  await request(`/v1/chapters/${chapter}/session`, forged.join('.'), undefined, 401);
  await request('/v1/chapters/hk/session', manager.token, undefined, 403);
  await request(`/v1/chapters/${chapter}/session`, judge1.token);
  const lineup = await request(`${root}/judge-lineup?limit=1`, judge1.token);
  assert.ok(lineup.next_page, 'pagination cursor is available');
  const second = await request(`${root}/judge-lineup?limit=1&cursor=${encodeURIComponent(lineup.next_page)}`, judge1.token);
  assert.equal(lineup.items.length + second.items.length, 1);
  assert.deepEqual(Object.keys((await request(`${root}/entries/ready/scorecard`, judge1.token))).sort(), ['crew_id', 'division_id', 'entry_id']);
  await request(`${root}/entries/draft/scorecard`, judge1.token, undefined, 403);
  await request(`${root}/judge-lineup`, manager.token, undefined, 403);
  await request(`/v1/chapters/${chapter}/crews/ready`, judge1.token, undefined, 403);
  const entry = await request(`${root}/entries/ready`, manager.token);
  assert.equal(entry.readiness.is_ready, true);

  const reference = `docker-ref-${randomUUID()}`;
  const payment = await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: reference, amount_minor: 100000 });
  assert.equal(payment.status, 'pending');
  assert.deepEqual(await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: reference, amount_minor: 100000 }), payment);
  await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: `${reference}-overflow`, amount_minor: 60000 }, 409);
  await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/reconcile`, manager.token, { approve: true }, 403);
  const paid = await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/reconcile`, finance.token, { approve: true });
  assert.equal(paid.status, 'settled');
  const refunded = await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/refund`, finance.token, {});
  assert.equal(refunded.status, 'refunded');
  assert.deepEqual(await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/refund`, finance.token, {}), refunded);

  const command = { schema_version: 1, operation_id: randomUUID(), division_id: 'open', crew_id: 'ready', expected_revision: 0, criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 }, deductions: [] };
  const receipt = await request(`${root}/scores`, judge1.token, command);
  assert.deepEqual(await request(`${root}/scores`, judge1.token, command), receipt);
  await request(`${root}/scores`, judge1.token, { ...command, operation_id: randomUUID() }, 409);
  await request(`${root}/divisions/open/lock`, head.token, {}, 409);
  await request(`${root}/scores`, judge2.token, { ...command, operation_id: randomUUID() });
  await request(`${root}/divisions/open/lock`, head.token, {});
  await request(`${root}/scores`, judge1.token, { ...command, operation_id: randomUUID(), expected_revision: 1 }, 409);
  const memberPath = `chapters/${chapter}/members/local-ph-judge1`;
  await put(memberPath, { uid: 'local-ph-judge1', chapter_id: chapter, role: 'judge', active: false, valid_after: 0 });
  await request(`/v1/chapters/${chapter}/session`, judge1.token, undefined, 403);
  await put(memberPath, { uid: 'local-ph-judge1', chapter_id: chapter, role: 'judge', active: true, valid_after: 0 });
  writeFileSync(file, JSON.stringify({ chapter, root, command, receipt }));
  console.log('PASS: signed login, wrong password, unsigned/forged token rejection, chapter/role/assignment isolation, bounded pagination, payment replay/reservation/refund, score replay/conflict/panel lock and membership revocation.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
